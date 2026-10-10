//! Local image storage. Every image lives inside the app's `images` folder and the
//! database stores its path relative to that folder ("covers/<uuid>.jpg"), never an
//! absolute path, so the data can move between devices.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

/// Image types the app accepts (what the webview can display).
const ALLOWED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "avif"];

/// Absolute path of the images folder, e.g. %APPDATA%\io.github.dagarhi.remedia\images.
pub fn images_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join("images"))
}

/// Copies a file chosen by the user into `images/<folder>/` under a new random name
/// and returns the relative path to store, e.g. "covers/3f2b….jpg".
/// The original file is never moved or changed.
pub fn import(app: &AppHandle, source: &Path, folder: &str) -> Result<String, String> {
    let extension = source
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .filter(|e| ALLOWED_EXTENSIONS.contains(&e.as_str()))
        .ok_or("unsupported_image")?;

    let file_name = format!("{}.{}", uuid::Uuid::new_v4(), extension);
    let target_dir = images_dir(app)?.join(folder);
    std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    std::fs::copy(source, target_dir.join(&file_name)).map_err(|e| e.to_string())?;

    // Forward slashes on every platform, so the stored path is the same everywhere.
    Ok(format!("{folder}/{file_name}"))
}

#[cfg(test)]
mod tests {
    use super::ALLOWED_EXTENSIONS;

    #[test]
    fn accepts_common_image_types_only() {
        assert!(ALLOWED_EXTENSIONS.contains(&"jpg"));
        assert!(!ALLOWED_EXTENSIONS.contains(&"exe"));
    }
}
