mod db;

use db::{Database, SqlQuery};
use serde_json::Value as Json;
use tauri::{Manager, State};

/// Runs one SQL statement built by Drizzle in the frontend.
#[tauri::command]
fn db_execute(db: State<Database>, query: SqlQuery) -> Result<Json, String> {
    db.execute(&query)
}

/// Runs several statements in one transaction.
#[tauri::command]
fn db_batch(db: State<Database>, queries: Vec<SqlQuery>) -> Result<Vec<Json>, String> {
    db.execute_batch(&queries)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // The database lives in the app data folder, e.g. %APPDATA%\io.github.dagarhi.remedia on Windows.
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let database = Database::open(&dir.join("remedia.db"))?;
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![db_execute, db_batch])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
