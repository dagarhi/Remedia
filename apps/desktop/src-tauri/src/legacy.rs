//! One-time move of the data folders named after the app's first identifier
//! (`io.github.dagarhi.remedia`) to the ones named after the current one (`app.remedia`),
//! so existing data is found after the change.

use std::fs;
use std::path::Path;

use tauri::{AppHandle, Manager};

pub const LEGACY_IDENTIFIER: &str = "io.github.dagarhi.remedia";

/// Files moved one by one when the new folder already exists (the webview may create it first).
const LOOSE_FILES: &[&str] = &["credentials.toml"];

/// Moves `<parent of new_dir>/<legacy identifier>` to `new_dir`. When `new_dir` already exists,
/// only the loose files it lacks are moved. Returns true when something was moved.
pub fn move_legacy(new_dir: &Path) -> std::io::Result<bool> {
    let Some(parent) = new_dir.parent() else { return Ok(false) };
    let old_dir = parent.join(LEGACY_IDENTIFIER);
    if old_dir == new_dir || !old_dir.exists() {
        return Ok(false);
    }

    if !new_dir.exists() {
        // Same parent folder, so the same drive: a rename is instant and moves everything.
        fs::rename(&old_dir, new_dir)?;
        return Ok(true);
    }

    let mut moved = false;
    for name in LOOSE_FILES {
        let (old_file, new_file) = (old_dir.join(name), new_dir.join(name));
        if old_file.exists() && !new_file.exists() {
            fs::rename(&old_file, &new_file)?;
            moved = true;
        }
    }
    Ok(moved)
}

/// Runs before the database is opened. Failures are reported but never block startup:
/// the old folder stays untouched and can still be moved by hand.
pub fn migrate(app: &AppHandle) {
    let dirs = [app.path().app_data_dir(), app.path().app_local_data_dir()];
    for dir in dirs.into_iter().flatten() {
        if let Err(error) = move_legacy(&dir) {
            eprintln!("Could not move the old data folder to {}: {error}", dir.display());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root(name: &str) -> std::path::PathBuf {
        let root = std::env::temp_dir().join(format!("remedia-legacy-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        root
    }

    #[test]
    fn moves_the_whole_old_folder_when_the_new_one_is_missing() {
        let root = temp_root("whole");
        let old = root.join(LEGACY_IDENTIFIER);
        fs::create_dir_all(old.join("images")).unwrap();
        fs::write(old.join("remedia.db"), b"db").unwrap();

        let new = root.join("app.remedia");
        assert!(move_legacy(&new).unwrap());
        assert_eq!(fs::read(new.join("remedia.db")).unwrap(), b"db");
        assert!(new.join("images").exists());
        assert!(!old.exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn moves_only_missing_loose_files_when_the_new_folder_exists() {
        let root = temp_root("loose");
        let old = root.join(LEGACY_IDENTIFIER);
        fs::create_dir_all(&old).unwrap();
        fs::write(old.join("credentials.toml"), b"[tmdb]").unwrap();
        let new = root.join("app.remedia");
        fs::create_dir_all(&new).unwrap();

        assert!(move_legacy(&new).unwrap());
        assert_eq!(fs::read(new.join("credentials.toml")).unwrap(), b"[tmdb]");
        // Nothing left to move the second time.
        assert!(!move_legacy(&new).unwrap());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn does_nothing_without_an_old_folder() {
        let root = temp_root("none");
        assert!(!move_legacy(&root.join("app.remedia")).unwrap());
        fs::remove_dir_all(root).unwrap();
    }
}
