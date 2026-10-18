mod backup;
mod credentials;
mod db;
mod images;
mod legacy;

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

/// Downloads a provider poster into the images folder; returns the relative path to store.
#[tauri::command]
async fn import_image_url(app: AppHandle, url: String, folder: String) -> Result<String, String> {
    images::download(&app, &url, &folder).await
}

/// Provider credentials from credentials.toml (read fresh every time, so hand edits apply at once).
#[tauri::command]
fn get_credentials(app: AppHandle) -> Result<credentials::Credentials, String> {
    credentials::load(&app)
}

#[tauri::command]
fn set_credentials(app: AppHandle, credentials: credentials::Credentials) -> Result<(), String> {
    credentials::save(&app, &credentials)
}

/// Absolute path of credentials.toml, for "Open configuration folder".
#[tauri::command]
fn credentials_path(app: AppHandle) -> Result<String, String> {
    Ok(credentials::path(&app)?.to_string_lossy().into_owned())
}

/// Copies the database and all images into a new folder `name` inside `parent`.
#[tauri::command]
fn create_backup(app: AppHandle, db: State<Database>, parent: PathBuf, name: String) -> Result<String, String> {
    backup::create(&app, &db, &parent, &name)
}

/// Restores a backup folder; returns where the safety copy of the previous data was saved.
#[tauri::command]
fn restore_backup(app: AppHandle, db: State<Database>, folder: PathBuf) -> Result<String, String> {
    backup::restore(&app, &db, &folder)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            // Data from before the identifier change is moved first, so it is found below.
            legacy::migrate(app.handle());
            // The database lives in the app data folder, e.g. %APPDATA%\app.remedia on Windows.
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let database = Database::open(&dir.join("remedia.db"))?;
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db_execute,
            db_batch,
            images_dir,
            import_image,
            import_image_url,
            get_credentials,
            set_credentials,
            credentials_path,
            create_backup,
            restore_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
