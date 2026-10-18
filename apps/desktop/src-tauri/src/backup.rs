//! Manual backups: a folder with a copy of the database and of every image.
//! Restoring replaces the database through SQLite's backup API, after saving a safety copy.

use std::fs;
use std::path::Path;

use tauri::{AppHandle, Manager};

use crate::db::{self, Database};
use crate::images;

/// Creates `<parent>/<name>/` with `remedia.db` and the `images` folder. Returns the folder path.
pub fn create(app: &AppHandle, db: &Database, parent: &Path, name: &str) -> Result<String, String> {
    let folder = parent.join(name);
    if folder.exists() {
        return Err("backup_exists".into());
    }
    fs::create_dir_all(&folder).map_err(|e| e.to_string())?;

    db.backup_to(&folder.join("remedia.db"))?;

    let images = images::images_dir(app)?;
    if images.exists() {
        copy_dir(&images, &folder.join("images")).map_err(|e| e.to_string())?;
    }
    Ok(folder.to_string_lossy().into_owned())
}

/// Restores a backup folder made by `create`. First saves a safety copy of the current data in
/// `<app data>/backups/`, then replaces the database and adds the backup's images to the
/// current ones (names are UUIDs, so nothing clashes and nothing is deleted).
/// Returns the safety copy's path.
pub fn restore(app: &AppHandle, db: &Database, folder: &Path) -> Result<String, String> {
    let source = folder.join("remedia.db");
    if !source.exists() {
        return Err("not_a_backup".into());
    }
    db::check_backup(&source)?;

    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or_default();
    let safety_parent = app.path().app_data_dir().map_err(|e| e.to_string())?.join("backups");
    let safety = create(app, db, &safety_parent, &format!("before-restore-{millis}"))?;

    db.restore_from(&source)?;

    let images = folder.join("images");
    if images.exists() {
        copy_dir(&images, &images::images_dir(app)?).map_err(|e| e.to_string())?;
    }
    Ok(safety)
}

/// Copies a folder and everything inside it.
fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let target = to.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::copy_dir;

    #[test]
    fn copies_nested_folders() {
        let base = std::env::temp_dir().join(format!("remedia-backup-test-{}", std::process::id()));
        let from = base.join("from");
        std::fs::create_dir_all(from.join("covers")).unwrap();
        std::fs::write(from.join("covers").join("a.jpg"), b"img").unwrap();

        copy_dir(&from, &base.join("to")).unwrap();

        assert_eq!(std::fs::read(base.join("to").join("covers").join("a.jpg")).unwrap(), b"img");
        std::fs::remove_dir_all(base).unwrap();
    }
}
