//! SQLite access for the desktop app.
//!
//! Rust only executes SQL: the queries are built in TypeScript by Drizzle (`@remedia/core`)
//! and arrive through two commands, `db_execute` and `db_batch`. This mirrors the
//! `SqlExecutor` / `SqlBatchExecutor` contract in `packages/core/src/db/proxy.ts`.

use std::path::Path;
use std::sync::Mutex;

use rusqlite::types::{Value, ValueRef};
use rusqlite::{params_from_iter, Connection, OpenFlags, MAIN_DB};
use serde::Deserialize;
use serde_json::{json, Value as Json};

/// Migrations shared with every platform; never edit one that has shipped, add a new file instead.
const MIGRATIONS: &[&str] = &[
    include_str!("../../../../packages/core/migrations/0001_initial.sql"),
    include_str!("../../../../packages/core/migrations/0002_history_events.sql"),
    include_str!("../../../../packages/core/migrations/0003_anime_template.sql"),
    include_str!("../../../../packages/core/migrations/0004_manga_template.sql"),
];

/// One connection behind a mutex: every query runs on the same connection, so
/// `PRAGMA foreign_keys` always applies and transactions cannot be split across connections.
pub struct Database(Mutex<Connection>);

#[derive(Deserialize)]
pub struct SqlQuery {
    sql: String,
    params: Vec<Json>,
    method: String,
}

impl Database {
    pub fn open(path: &Path) -> rusqlite::Result<Self> {
        Self::init(Connection::open(path)?)
    }

    #[cfg(test)]
    fn open_in_memory() -> rusqlite::Result<Self> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(mut conn: Connection) -> rusqlite::Result<Self> {
        // SQLite does not enforce foreign keys unless asked, on every connection.
        conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
        run_migrations(&mut conn)?;
        Ok(Self(Mutex::new(conn)))
    }

    pub fn execute(&self, query: &SqlQuery) -> Result<Json, String> {
        let conn = self.0.lock().map_err(|e| e.to_string())?;
        run_query(&conn, query).map_err(|e| e.to_string())
    }

    /// Replaces the whole database with the one at `source` (a backup), while the app stays open.
    /// Refuses files that are not Remedia databases or come from a newer app version, then
    /// brings an older backup up to date with the migrations.
    pub fn restore_from(&self, source: &Path) -> Result<(), String> {
        check_backup(source)?;
        let mut conn = self.0.lock().map_err(|e| e.to_string())?;
        // SQLite's online backup API copies every page into the open connection.
        conn.restore(MAIN_DB, source, None::<fn(rusqlite::backup::Progress)>)
            .map_err(|e| e.to_string())?;
        run_migrations(&mut conn).map_err(|e| e.to_string())
    }

    /// Writes a consistent copy of the whole database to `target` (which must not exist yet).
    /// `VACUUM INTO` works while the app is open and includes changes still in the WAL file.
    pub fn backup_to(&self, target: &Path) -> Result<(), String> {
        let conn = self.0.lock().map_err(|e| e.to_string())?;
        conn.execute("VACUUM INTO ?1", [target.to_string_lossy()]).map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Runs every query in one transaction: if one fails, none is applied.
    pub fn execute_batch(&self, queries: &[SqlQuery]) -> Result<Vec<Json>, String> {
        let mut conn = self.0.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let results = queries
            .iter()
            .map(|q| run_query(&tx, q))
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
        Ok(results)
    }
}

/// Checks that `path` is a Remedia database this app can open (not from a newer version).
pub fn check_backup(path: &Path) -> Result<(), String> {
    if backup_version(path)? > MIGRATIONS.len() as i64 {
        return Err("backup_from_newer_version".into());
    }
    Ok(())
}

/// The migration version of a backup file, after checking it really is a Remedia database.
fn backup_version(path: &Path) -> Result<i64, String> {
    let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|_| "not_a_backup")?;
    let has_records: bool = conn
        .query_row("SELECT count(*) > 0 FROM sqlite_master WHERE type = 'table' AND name = 'records'", [], |r| r.get(0))
        .map_err(|_| "not_a_backup")?;
    if !has_records {
        return Err("not_a_backup".into());
    }
    conn.query_row("PRAGMA user_version", [], |r| r.get(0)).map_err(|e| e.to_string())
}

/// Applies the migrations newer than `PRAGMA user_version`, each in its own transaction.
fn run_migrations(conn: &mut Connection) -> rusqlite::Result<()> {
    let current: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    for (i, sql) in MIGRATIONS.iter().enumerate().skip(current as usize) {
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.execute_batch(&format!("PRAGMA user_version = {}", i + 1))?;
        tx.commit()?;
    }
    Ok(())
}

/// Executes one statement and shapes the result the way Drizzle's sqlite-proxy expects:
/// `{ rows: [[...], ...] }`, or `{ rows: [...] }` (one row, or null) for "get".
fn run_query(conn: &Connection, query: &SqlQuery) -> rusqlite::Result<Json> {
    let mut stmt = conn.prepare(&query.sql)?;
    let column_count = stmt.column_count();
    let mut rows = stmt.query(params_from_iter(query.params.iter().map(to_sql_value)))?;

    let mut out: Vec<Json> = Vec::new();
    while let Some(row) = rows.next()? {
        let values = (0..column_count)
            .map(|i| row.get_ref(i).map(to_json))
            .collect::<rusqlite::Result<Vec<_>>>()?;
        out.push(Json::Array(values));
        if query.method == "get" {
            break;
        }
    }

    Ok(match query.method.as_str() {
        "run" => json!({ "rows": [] }),
        "get" => json!({ "rows": out.into_iter().next() }),
        _ => json!({ "rows": out }),
    })
}

fn to_sql_value(value: &Json) -> Value {
    match value {
        Json::Null => Value::Null,
        Json::Bool(b) => Value::Integer(i64::from(*b)),
        Json::Number(n) => match n.as_i64() {
            Some(i) => Value::Integer(i),
            None => Value::Real(n.as_f64().unwrap_or(f64::NAN)),
        },
        Json::String(s) => Value::Text(s.clone()),
        // Drizzle serialises JSON columns itself, so objects only arrive here by mistake: store them as text.
        other => Value::Text(other.to_string()),
    }
}

fn to_json(value: ValueRef) -> Json {
    match value {
        ValueRef::Null => Json::Null,
        ValueRef::Integer(i) => json!(i),
        ValueRef::Real(f) => json!(f),
        ValueRef::Text(t) => Json::String(String::from_utf8_lossy(t).into_owned()),
        ValueRef::Blob(b) => json!(b),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn query(sql: &str, params: Vec<Json>, method: &str) -> SqlQuery {
        SqlQuery { sql: sql.into(), params, method: method.into() }
    }

    const ID: &str = "3f2b8c1e-1d2c-4b5a-9e8f-0a1b2c3d4e5f";

    #[test]
    fn migrates_and_seeds_built_in_templates() {
        let db = Database::open_in_memory().unwrap();
        let result = db.execute(&query("SELECT count(*) FROM templates", vec![], "get")).unwrap();
        assert_eq!(result, json!({ "rows": [7] }));
    }

    #[test]
    fn inserts_and_reads_rows_as_arrays() {
        let db = Database::open_in_memory().unwrap();
        let insert = "INSERT INTO records (id, template, title, fields, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)";
        let params = vec![json!(ID), json!("movie"), json!("Arrival"), json!("{\"runtime\":116}"), json!(1), json!(1)];
        db.execute(&query(insert, params, "run")).unwrap();

        let all = db.execute(&query("SELECT title, rating, fields FROM records", vec![], "all")).unwrap();
        assert_eq!(all, json!({ "rows": [["Arrival", null, "{\"runtime\":116}"]] }));

        let missing = db.execute(&query("SELECT title FROM records WHERE id = ?", vec![json!("x")], "get")).unwrap();
        assert_eq!(missing, json!({ "rows": null }));
    }

    #[test]
    fn backs_up_to_a_readable_copy() {
        let db = Database::open_in_memory().unwrap();
        let target = std::env::temp_dir().join(format!("remedia-backup-{}.db", std::process::id()));
        let _ = std::fs::remove_file(&target);

        db.backup_to(&target).unwrap();

        let copy = Database::open(&target).unwrap();
        let result = copy.execute(&query("SELECT count(*) FROM templates", vec![], "get")).unwrap();
        assert_eq!(result, json!({ "rows": [7] }));
        drop(copy);
        let _ = std::fs::remove_file(&target);
    }

    #[test]
    fn restores_a_backup_into_the_open_database() {
        let original = Database::open_in_memory().unwrap();
        let insert = "INSERT INTO records (id, template, title, created_at, updated_at) VALUES (?, 'movie', 'Arrival', 1, 1)";
        original.execute(&query(insert, vec![json!(ID)], "run")).unwrap();
        let file = std::env::temp_dir().join(format!("remedia-restore-{}.db", std::process::id()));
        let _ = std::fs::remove_file(&file);
        original.backup_to(&file).unwrap();

        let current = Database::open_in_memory().unwrap();
        current.restore_from(&file).unwrap();

        let titles = current.execute(&query("SELECT title FROM records", vec![], "all")).unwrap();
        assert_eq!(titles, json!({ "rows": [["Arrival"]] }));
        let _ = std::fs::remove_file(&file);
    }

    #[test]
    fn refuses_files_that_are_not_backups() {
        let file = std::env::temp_dir().join(format!("remedia-not-a-backup-{}.db", std::process::id()));
        std::fs::write(&file, b"hello").unwrap();
        let db = Database::open_in_memory().unwrap();
        assert_eq!(db.restore_from(&file).unwrap_err(), "not_a_backup");
        let _ = std::fs::remove_file(&file);
    }

    #[test]
    fn enforces_foreign_keys() {
        let db = Database::open_in_memory().unwrap();
        let insert = "INSERT INTO records (id, template, title, created_at, updated_at) VALUES (?, 'nope', 'x', 1, 1)";
        let error = db.execute(&query(insert, vec![json!(ID)], "run")).unwrap_err();
        assert!(error.contains("FOREIGN KEY"), "{error}");
    }

    #[test]
    fn batch_rolls_back_on_failure() {
        let db = Database::open_in_memory().unwrap();
        let ok = query(
            "INSERT INTO records (id, template, title, created_at, updated_at) VALUES (?, 'movie', 'Arrival', 1, 1)",
            vec![json!(ID)],
            "run",
        );
        let bad = query("INSERT INTO records (id, template, title, created_at, updated_at) VALUES ('bad', 'movie', 'x', 1, 1)", vec![], "run");
        assert!(db.execute_batch(&[ok, bad]).is_err());

        let count = db.execute(&query("SELECT count(*) FROM records", vec![], "get")).unwrap();
        assert_eq!(count, json!({ "rows": [0] }));
    }
}
