//! Provider credentials in `credentials.toml` (UI Design, token storage): a human-readable
//! file in the app config folder, separate from the database. Never exported, backed up or
//! synced. It is read on every request, so hand edits apply at once.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Default, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct Tmdb {
    /// API key (v3) or API Read Access Token.
    pub token: String,
}

#[derive(Default, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct Igdb {
    pub client_id: String,
    pub client_secret: String,
}

#[derive(Default, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct Credentials {
    pub tmdb: Tmdb,
    pub igdb: Igdb,
}

/// The device's local app folder (%LOCALAPPDATA%\<app> on Windows): separate from the data
/// folder that holds the database and images, and never roamed to other machines.
pub fn path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("credentials.toml"))
}

/// Earlier versions kept the file in the roaming config folder, next to the database.
/// Moves it once to the local folder so the key does not have to be entered again.
fn move_from_old_location(app: &AppHandle, new_path: &PathBuf) {
    let Ok(old_dir) = app.path().app_config_dir() else { return };
    let old_path = old_dir.join("credentials.toml");
    if old_path == *new_path || !old_path.exists() || new_path.exists() {
        return;
    }
    if let Some(dir) = new_path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    // Copy then delete, since the two folders can be on different drives.
    if std::fs::copy(&old_path, new_path).is_ok() {
        let _ = std::fs::remove_file(&old_path);
    }
}

/// Reads the file. A missing file means no credentials; a malformed one is an error with
/// its message (line and column), so Settings can show it. It never blocks startup.
pub fn load(app: &AppHandle) -> Result<Credentials, String> {
    let path = path(app)?;
    move_from_old_location(app, &path);
    match std::fs::read_to_string(&path) {
        Ok(text) => toml::from_str(&text).map_err(|e| format!("malformed_credentials: {e}")),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Credentials::default()),
        Err(e) => Err(e.to_string()),
    }
}

/// Writes the whole file with explanatory comments, so it can be edited by hand.
pub fn save(app: &AppHandle, credentials: &Credentials) -> Result<(), String> {
    let path = path(app)?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, render(credentials)).map_err(|e| e.to_string())
}

/// TOML strings are written with toml's own escaping, so any pasted value stays valid.
fn quoted(value: &str) -> String {
    toml::Value::String(value.to_owned()).to_string()
}

fn render(c: &Credentials) -> String {
    format!(
        "# Remedia credentials for external services.\n\
         # Personal keys stay on this device: they are never exported, backed up or synced.\n\
         # You can edit this file by hand; Remedia reads it again on every search.\n\
         \n\
         [tmdb]\n\
         # Movies and series. API key (v3) or API Read Access Token from\n\
         # https://www.themoviedb.org/settings/api\n\
         token = {}\n\
         \n\
         [igdb]\n\
         # Video games. Client ID and secret of a Twitch application from\n\
         # https://dev.twitch.tv/console/apps\n\
         client_id = {}\n\
         client_secret = {}\n",
        quoted(&c.tmdb.token),
        quoted(&c.igdb.client_id),
        quoted(&c.igdb.client_secret),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rendered_file_reads_back_the_same_values() {
        let mut c = Credentials::default();
        c.tmdb.token = "abc\"123".into();
        c.igdb.client_id = "id".into();
        let parsed: Credentials = toml::from_str(&render(&c)).unwrap();
        assert_eq!(parsed.tmdb.token, "abc\"123");
        assert_eq!(parsed.igdb.client_id, "id");
        assert_eq!(parsed.igdb.client_secret, "");
    }

    #[test]
    fn missing_sections_use_defaults() {
        let parsed: Credentials = toml::from_str("[tmdb]\ntoken = \"x\"\n").unwrap();
        assert_eq!(parsed.tmdb.token, "x");
        assert_eq!(parsed.igdb.client_id, "");
    }
}
