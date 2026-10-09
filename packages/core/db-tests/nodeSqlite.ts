import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { SqlBatchExecutor, SqlExecutor, SqlQuery, SqlResult, SqlValue } from "../src/db/proxy";

/*
 * Test double of the desktop's Rust database layer, built on node:sqlite.
 * It follows the same rules, so tests exercise the real migrations and the real proxy contract.
 */

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "migrations");

export function openTestDatabase(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  runMigrations(db);
  return db;
}

/** Applies every migration newer than `PRAGMA user_version`, each in its own transaction. */
export function runMigrations(db: DatabaseSync): void {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  const current = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  files.slice(current).forEach((file, i) => {
    db.exec("BEGIN");
    try {
      db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      db.exec(`PRAGMA user_version = ${current + i + 1}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  });
}

const toSqlite = (value: SqlValue): SQLInputValue => (typeof value === "boolean" ? Number(value) : value);

function runOne(db: DatabaseSync, { sql, params, method }: SqlQuery): SqlResult {
  const statement = db.prepare(sql);
  const args = params.map(toSqlite);
  if (method === "run") {
    statement.run(...args);
    return { rows: [] };
  }
  statement.setReturnArrays(true);
  if (method === "get") return { rows: statement.get(...args) as SqlValue[] | undefined };
  return { rows: statement.all(...args) as unknown as SqlValue[][] };
}

export function nodeExecutor(db: DatabaseSync): SqlExecutor {
  return async (query) => runOne(db, query);
}

export function nodeBatchExecutor(db: DatabaseSync): SqlBatchExecutor {
  return async (queries) => {
    db.exec("BEGIN");
    try {
      const results = queries.map((q) => runOne(db, q));
      db.exec("COMMIT");
      return results;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
}
