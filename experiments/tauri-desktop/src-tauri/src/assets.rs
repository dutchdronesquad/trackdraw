use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::HashSet;

pub fn digest(bytes: impl AsRef<[u8]>) -> String {
    format!("{:x}", Sha256::digest(bytes.as_ref()))
}

pub fn valid_manifest(value: &Value) -> bool {
    let Some(entries) = value["entries"].as_array() else {
        return false;
    };
    if value["version"] != 1 || entries.is_empty() || entries.len() >= 10000 {
        return false;
    }
    let mut paths = HashSet::new();
    let mut size = 0_u64;
    for entry in entries {
        let (Some(path), Some(hash), Some(bytes)) = (
            entry["path"].as_str(),
            entry["sha256"].as_str(),
            entry["size"].as_u64(),
        ) else {
            return false;
        };
        if !path.starts_with('/')
            || path.starts_with("//")
            || path.split('/').any(|s| s == "." || s == "..")
            || !path
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || b"_./@ -".contains(&c))
            || !paths.insert(path)
            || hash.len() != 64
            || !hash
                .bytes()
                .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
            || bytes > 32 * 1024 * 1024
        {
            return false;
        }
        size += bytes;
    }
    size <= 128 * 1024 * 1024
        && value["revision"].as_str()
            == Some(digest(serde_json::to_vec(entries).unwrap_or_default()).as_str())
}

// Tauri embeds these files in the executable. Preparation no longer needs a
// second content-addressed copy outside the installed application.
pub fn verify_embedded(
    manifest: &Value,
    mut read: impl FnMut(&str) -> Option<Vec<u8>>,
) -> Result<(), String> {
    if !valid_manifest(manifest) {
        return Err("Invalid bundled asset manifest".into());
    }
    for entry in manifest["entries"].as_array().unwrap() {
        let bytes = read(entry["path"].as_str().unwrap().trim_start_matches('/'))
            .ok_or("A bundled file is missing")?;
        if bytes.len() as u64 != entry["size"].as_u64().unwrap()
            || digest(&bytes) != entry["sha256"].as_str().unwrap()
        {
            return Err("A bundled file is damaged".into());
        }
    }
    Ok(())
}
