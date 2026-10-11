//! Manual backups: a folder with a copy of the database and of every image.
//! Restoring is copying them back into the app data folder while the app is closed.

use std::fs;
use std::path::Path;

use tauri::AppHandle;

use crate::db::Database;
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
