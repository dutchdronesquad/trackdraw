use rusqlite::Connection;
use serde_json::{json, Value};
use tempfile::tempdir;
use trackdraw_desktop::{
    assets::{digest, valid_manifest, verify_embedded},
    files::{import_legacy_database, read_project, write_backup},
    repository::{Repository, MAX_PROJECT_BYTES},
};
fn design(id: &str) -> Value {
    json!({"id":id,"version":2,"title":id,"createdAt":"2026-10-24T10:00:00Z","updatedAt":"2026-10-24T10:00:00Z","field":{"width":60,"height":40,"gridStep":1},"shapes":[]})
}
#[test]
fn rich_project_survives_save_restart_and_inactive_copy() {
    let temp = tempdir().unwrap();
    let file = temp.path().join("projects.sqlite");
    let fixture: Value = serde_json::from_str(include_str!(
        "../../../../tests/fixtures/json-roundtrip.json"
    ))
    .unwrap();
    {
        let mut repo = Repository::open(&file, None).unwrap();
        repo.command("save", &json!({"design":fixture,"restore":true}))
            .unwrap();
    }
    let mut repo = Repository::open(&file, None).unwrap();
    let mut copy = fixture.clone();
    copy["id"] = "copy".into();
    let result = repo.command("save-copy", &json!({"design":copy})).unwrap();
    assert_eq!(result["draft"], fixture);
    assert_eq!(result["designs"][0], copy);
    assert_eq!(result["designs"][1], fixture);
    assert_eq!(result["restorePoints"].as_array().unwrap().len(), 1);
}
#[test]
fn write_failure_rolls_back_draft_and_project_together() {
    let temp = tempdir().unwrap();
    let file = temp.path().join("projects.sqlite");
    let mut repo = Repository::open(&file, None).unwrap();
    repo.command("save", &json!({"design":design("safe")}))
        .unwrap();
    Connection::open(&file).unwrap().execute_batch("CREATE TRIGGER fail_write BEFORE INSERT ON projects BEGIN SELECT RAISE(ABORT,'disk failed'); END;").unwrap();
    assert!(repo
        .command("save", &json!({"design":design("unsaved"),"restore":true}))
        .is_err());
    let state = repo.snapshot().unwrap();
    assert_eq!(state["draft"], design("safe"));
    assert_eq!(state["designs"], json!([design("safe")]));
    assert_eq!(state["restorePoints"], json!([]));
}
#[test]
fn restore_preserves_current_work_and_history_prunes_per_project() {
    let temp = tempdir().unwrap();
    let mut repo = Repository::open(&temp.path().join("db"), None).unwrap();
    let old = repo
        .command("save", &json!({"design":design("one"),"restore":true}))
        .unwrap();
    let id = old["restorePoints"][0]["id"].clone();
    repo.command("save", &json!({"design":design("two")}))
        .unwrap();
    let state = repo.command("restore", &json!({"id":id})).unwrap();
    assert_eq!(state["draft"]["id"], "one");
    assert!(state["restorePoints"]
        .as_array()
        .unwrap()
        .iter()
        .any(|p| p["designId"] == "two"));
    for _ in 0..15 {
        repo.command("save", &json!({"design":design("one"),"restore":true}))
            .unwrap();
    }
    let points = repo.snapshot().unwrap()["restorePoints"]
        .as_array()
        .unwrap()
        .clone();
    assert_eq!(points.iter().filter(|p| p["designId"] == "one").count(), 10);
    assert_eq!(points.iter().filter(|p| p["designId"] == "two").count(), 1);
}
#[test]
fn rename_delete_and_invalid_commands_preserve_other_projects() {
    let temp = tempdir().unwrap();
    let mut repo = Repository::open(&temp.path().join("db"), None).unwrap();
    repo.command("save", &json!({"design":design("one"),"restore":true}))
        .unwrap();
    repo.command("save-copy", &json!({"design":design("two")}))
        .unwrap();
    let renamed = repo
        .command("rename", &json!({"id":"one","title":"Race"}))
        .unwrap();
    assert_eq!(renamed["draft"]["title"], "Race");
    assert!(repo.command("delete", &json!({"ids":["one",7]})).is_err());
    assert!(repo
        .command("sql", &json!({"query":"DROP TABLE projects"}))
        .is_err());
    let state = repo.command("delete", &json!({"ids":["one"]})).unwrap();
    assert!(state["draft"].is_null());
    assert_eq!(state["restorePoints"], json!([]));
    assert_eq!(state["designs"], json!([design("two")]));
}
#[test]
fn future_database_is_refused_without_writing_it() {
    let temp = tempdir().unwrap();
    let file = temp.path().join("future");
    {
        Connection::open(&file).unwrap().execute_batch("CREATE TABLE sentinel(value); INSERT INTO sentinel VALUES('keep'); PRAGMA user_version=999;").unwrap();
    }
    let before = std::fs::read(&file).unwrap();
    assert!(Repository::open(&file, None).is_err());
    assert_eq!(std::fs::read(file).unwrap(), before);
}
#[test]
fn version_one_database_is_upgraded_without_losing_projects() {
    let temp = tempdir().unwrap();
    let file = temp.path().join("old");
    {
        let mut repo = Repository::open(&file, None).unwrap();
        repo.command("save", &json!({"design":design("one"),"restore":true}))
            .unwrap();
    }
    {
        Connection::open(&file)
            .unwrap()
            .execute_batch("DROP TABLE offline_preparations; PRAGMA user_version=1;")
            .unwrap();
    }
    let repo = Repository::open(&file, None).unwrap();
    let state = repo.snapshot().unwrap();
    assert_eq!(state["draft"], design("one"));
    assert_eq!(state["restorePoints"].as_array().unwrap().len(), 1);
}
#[test]
fn electron_wal_is_copied_consistently_once_without_overwriting_either_database() {
    let temp = tempdir().unwrap();
    let source = temp.path().join("electron.sqlite");
    let target = temp.path().join("tauri.sqlite");
    let mut original = Repository::open(&source, None).unwrap();
    original
        .command("save", &json!({"design":design("old"),"restore":true}))
        .unwrap();
    assert!(import_legacy_database(&source, &target).unwrap());
    let mut copied = Repository::open(&target, None).unwrap();
    assert_eq!(copied.snapshot().unwrap(), original.snapshot().unwrap());
    copied
        .command("save", &json!({"design":design("tauri")}))
        .unwrap();
    original
        .command("save", &json!({"design":design("electron")}))
        .unwrap();
    assert!(!import_legacy_database(&source, &target).unwrap());
    assert_eq!(copied.snapshot().unwrap()["draft"]["id"], "tauri");
    assert_eq!(original.snapshot().unwrap()["draft"]["id"], "electron");
}
#[test]
fn oversized_and_invalid_json_are_rejected_without_losing_saved_data() {
    let temp = tempdir().unwrap();
    let mut repo = Repository::open(&temp.path().join("db"), None).unwrap();
    let mut huge = design("huge");
    huge["description"] = "x".repeat(MAX_PROJECT_BYTES).into();
    repo.command("save", &json!({"design":design("safe")}))
        .unwrap();
    assert!(repo.command("save", &json!({"design":huge})).is_err());
    assert_eq!(repo.snapshot().unwrap()["draft"]["id"], "safe");
    let file = temp.path().join("invalid.json");
    std::fs::write(&file, b"not json").unwrap();
    assert!(read_project(&file).is_err());
}
#[test]
fn exported_backup_is_replaced_atomically_and_stays_a_normal_project_file() {
    let temp = tempdir().unwrap();
    let file = temp.path().join("track.json");
    write_backup(
        &file,
        serde_json::to_string(&design("one")).unwrap().as_bytes(),
    )
    .unwrap();
    write_backup(
        &file,
        serde_json::to_string(&design("two")).unwrap().as_bytes(),
    )
    .unwrap();
    assert_eq!(
        serde_json::from_str::<Value>(&read_project(&file).unwrap()).unwrap(),
        design("two")
    );
    assert_eq!(std::fs::read_dir(temp.path()).unwrap().count(), 1);
}
#[test]
fn manifest_rejects_tampering_path_traversal_and_missing_embedded_assets() {
    let entries = json!([{"path":"/index.html","sha256":digest("hello"),"size":5}]);
    let mut manifest = json!({"version":1,"revision":digest(serde_json::to_vec(&entries).unwrap()),"entries":entries});
    assert!(valid_manifest(&manifest));
    assert!(verify_embedded(&manifest, |_| Some(b"hello".to_vec())).is_ok());
    assert!(verify_embedded(&manifest, |_| Some(b"wrong".to_vec())).is_err());
    assert!(verify_embedded(&manifest, |_| None).is_err());
    manifest["entries"][0]["path"] = "/../private".into();
    assert!(!valid_manifest(&manifest));
}
