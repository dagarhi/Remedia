//! Local image storage. Every image lives inside the app's `images` folder and the
//! database stores its path relative to that folder ("covers/<uuid>.jpg"), never an
//! absolute path, so the data can move between devices.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

/// Image types the app accepts (what the webview can display).
const ALLOWED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "avif"];

/// Sub-folders of the images folder the app writes to. Anything else is refused, so a
/// request can never write outside the images folder (e.g. with "../").
const ALLOWED_FOLDERS: &[&str] = &["covers", "avatars"];

fn check_folder(folder: &str) -> Result<(), String> {
    if ALLOWED_FOLDERS.contains(&folder) {
        Ok(())
    } else {
        Err("folder_not_allowed".into())
    }
}

/// Absolute path of the images folder, e.g. %APPDATA%\io.github.dagarhi.remedia\images.
pub fn images_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join("images"))
}

/// Copies a file chosen by the user into `images/<folder>/` under a new random name
/// and returns the relative path to store, e.g. "covers/3f2b….jpg".
/// The original file is never moved or changed.
pub fn import(app: &AppHandle, source: &Path, folder: &str) -> Result<String, String> {
    check_folder(folder)?;
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

/// Image hosts of the supported providers. Posters are only downloaded from these.
const ALLOWED_IMAGE_HOSTS: &[&str] = &[
    "image.tmdb.org",
    "covers.openlibrary.org",
    "books.google.com",
    "s4.anilist.co",
    "cdn.myanimelist.net",
    "static.tvmaze.com",
    "media.rawg.io",
    "images.igdb.com",
];

fn extension_for(content_type: &str) -> Option<&'static str> {
    match content_type.split(';').next()?.trim() {
        "image/jpeg" => Some("jpg"),
        "image/png" => Some("png"),
        "image/webp" => Some("webp"),
        "image/gif" => Some("gif"),
        "image/avif" => Some("avif"),
        _ => None,
    }
}

/// Downloads a provider's poster into `images/<folder>/` and returns the relative path.
/// Images are always stored locally; the remote URL is never used for display (data model).
pub async fn download(app: &AppHandle, url: &str, folder: &str) -> Result<String, String> {
    check_folder(folder)?;
    let parsed = tauri::Url::parse(url).map_err(|e| e.to_string())?;
    if parsed.scheme() != "https" || !ALLOWED_IMAGE_HOSTS.contains(&parsed.host_str().unwrap_or("")) {
        return Err("image_host_not_allowed".into());
    }

    let response = tauri_plugin_http::reqwest::get(parsed).await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("download_failed: {}", response.status()));
    }
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_owned();
    let extension = extension_for(&content_type).ok_or("unsupported_image")?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    let file_name = format!("{}.{}", uuid::Uuid::new_v4(), extension);
    let target_dir = images_dir(app)?.join(folder);
    std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    std::fs::write(target_dir.join(&file_name), &bytes).map_err(|e| e.to_string())?;
    Ok(format!("{folder}/{file_name}"))
}

#[cfg(test)]
mod tests {
    use super::{check_folder, extension_for, ALLOWED_EXTENSIONS};

    #[test]
    fn only_writes_to_known_folders() {
        assert!(check_folder("covers").is_ok());
        assert!(check_folder("avatars").is_ok());
        assert!(check_folder("../outside").is_err());
    }

    #[test]
    fn maps_image_content_types() {
        assert_eq!(extension_for("image/jpeg"), Some("jpg"));
        assert_eq!(extension_for("image/png; charset=binary"), Some("png"));
        assert_eq!(extension_for("text/html"), None);
    }

    #[test]
    fn accepts_common_image_types_only() {
        assert!(ALLOWED_EXTENSIONS.contains(&"jpg"));
        assert!(!ALLOWED_EXTENSIONS.contains(&"exe"));
    }
}
