mod db;
mod images;

use std::path::PathBuf;

use db::{Database, SqlQuery};
use serde_json::Value as Json;
use tauri::{AppHandle, Manager, State};

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

/// Absolute path of the images folder, to turn stored relative paths into displayable URLs.
#[tauri::command]
fn images_dir(app: AppHandle) -> Result<String, String> {
    Ok(images::images_dir(&app)?.to_string_lossy().into_owned())
}

/// Copies an image chosen by the user into the images folder; returns the relative path to store.
#[tauri::command]
fn import_image(app: AppHandle, source: PathBuf, folder: String) -> Result<String, String> {
    images::import(&app, &source, &folder)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // The database lives in the app data folder, e.g. %APPDATA%\io.github.dagarhi.remedia on Windows.
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let database = Database::open(&dir.join("remedia.db"))?;
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![db_execute, db_batch, images_dir, import_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
