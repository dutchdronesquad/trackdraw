use crate::repository::MAX_PROJECT_BYTES;
use rusqlite::{backup::Backup, Connection, OpenFlags};
use serde_json::Value;
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::Path,
    time::Duration,
};
use tempfile::NamedTempFile;

pub fn validate_project_text(text: &str) -> Result<(), String> {
    if text.len() > MAX_PROJECT_BYTES {
        return Err("Project exceeds the 16 MiB desktop limit.".into());
    }
    let value: Value =
        serde_json::from_str(text).map_err(|_| "Choose a TrackDraw project JSON file.")?;
    if !value.is_object()
        || value.get("version").is_some_and(|v| v != 1 && v != 2)
        || (!value["shapes"].is_array() && !value["shapeOrder"].is_array())
        || !value["field"].is_object()
    {
        return Err("Choose a TrackDraw project JSON file.".into());
    }
    Ok(())
}
pub fn read_project(filename: &Path) -> Result<String, String> {
    let file = File::open(filename).map_err(|e| e.to_string())?;
    let mut text = String::new();
    file.take((MAX_PROJECT_BYTES + 1) as u64)
        .read_to_string(&mut text)
        .map_err(|e| e.to_string())?;
    validate_project_text(&text)?;
    Ok(text)
}
pub fn write_backup(filename: &Path, bytes: &[u8]) -> Result<(), String> {
    replace_file(filename, |file| {
        file.write_all(bytes)?;
        file.sync_all()
    })
}
fn replace_file(
    filename: &Path,
    prepare: impl FnOnce(&mut File) -> std::io::Result<()>,
) -> Result<(), String> {
    let parent = filename.parent().ok_or("Choose a writable destination")?;
    let mut temporary = NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    prepare(temporary.as_file_mut()).map_err(|e| e.to_string())?;
    // tempfile uses atomic replace semantics, including MoveFileExW on Windows.
    temporary.persist(filename).map_err(|e| e.to_string())?;
    Ok(())
}

// Copy SQLite through its backup API: a live Electron WAL is included, and the
// original database is neither moved nor modified. Never overwrite Tauri data.
pub fn import_legacy_database(source: &Path, destination: &Path) -> Result<bool, String> {
    if destination.exists() || !source.is_file() {
        return Ok(false);
    }
    let parent = destination.parent().ok_or("Invalid data directory")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let source = Connection::open_with_flags(source, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| e.to_string())?;
    source
        .busy_timeout(Duration::from_secs(5))
        .map_err(|e| e.to_string())?;
    let version: i64 = source
        .query_row("PRAGMA user_version", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if version > 2 {
        return Err("The previous desktop database requires a newer TrackDraw version. No data was changed.".into());
    }
    let temporary = NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    {
        let mut target = Connection::open(temporary.path()).map_err(|e| e.to_string())?;
        let backup = Backup::new(&source, &mut target).map_err(|e| e.to_string())?;
        backup
            .run_to_completion(64, Duration::from_millis(10), None)
            .map_err(|e| e.to_string())?;
    }
    temporary.as_file().sync_all().map_err(|e| e.to_string())?;
    temporary
        .persist_noclobber(destination)
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn failed_partial_write_or_sync_preserves_previous_backup_and_cleans_temporary_file() {
        let directory = tempfile::tempdir().unwrap();
        let destination = directory.path().join("backup.json");
        fs::write(&destination, b"previous backup").unwrap();
        for completed_write in [false, true] {
            let result = replace_file(&destination, |file| {
                file.write_all(if completed_write {
                    b"new backup"
                } else {
                    b"new"
                })?;
                Err(std::io::Error::other(if completed_write {
                    "sync failed"
                } else {
                    "disk full"
                }))
            });
            assert!(result.is_err());
            assert_eq!(fs::read(&destination).unwrap(), b"previous backup");
            assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
        }
    }
    #[test]
    fn failed_atomic_replace_preserves_destination_and_cleans_temporary_file() {
        let directory = tempfile::tempdir().unwrap();
        let destination = directory.path().join("existing-directory");
        fs::create_dir(&destination).unwrap();
        fs::write(destination.join("keep"), b"keep").unwrap();
        assert!(write_backup(&destination, b"new backup").is_err());
        assert_eq!(fs::read(destination.join("keep")).unwrap(), b"keep");
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
    }
}
