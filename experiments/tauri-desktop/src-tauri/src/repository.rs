use crate::assets::{digest, valid_manifest};
use chrono::{SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::{json, Value};
use std::{path::Path, time::Duration};
use uuid::Uuid;

pub const MAX_PROJECT_BYTES: usize = 16 * 1024 * 1024;
fn error(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn text(value: &Value) -> Result<String, String> {
    serde_json::to_string(value).map_err(error)
}
fn parse(value: String) -> Result<Value, String> {
    serde_json::from_str(&value).map_err(error)
}
fn now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}
pub fn validate_design(design: &Value) -> Result<(), String> {
    if design["version"] != 2
        || design["id"].as_str().is_none_or(str::is_empty)
        || !design["title"].is_string()
        || !design["shapes"].is_array()
        || !design["field"].is_object()
    {
        return Err("Invalid TrackDraw project.".into());
    }
    if text(design)?.len() > MAX_PROJECT_BYTES {
        return Err("Project exceeds the 16 MiB desktop limit.".into());
    }
    Ok(())
}

pub struct Repository {
    connection: Connection,
    manifest: Option<Value>,
}
impl Repository {
    pub fn open(filename: &Path, manifest: Option<Value>) -> Result<Self, String> {
        let mut connection = Connection::open(filename).map_err(error)?;
        let version: i64 = connection
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .map_err(error)?;
        if version > 2 {
            return Err(
                "This project database requires a newer TrackDraw version. No data was changed."
                    .into(),
            );
        }
        connection
            .busy_timeout(Duration::from_secs(5))
            .map_err(error)?;
        connection
            .execute_batch(
                "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;",
            )
            .map_err(error)?;
        if version < 2 {
            let tx = connection.transaction().map_err(error)?;
            if version == 0 {
                tx.execute_batch("CREATE TABLE projects (id TEXT PRIMARY KEY, design TEXT NOT NULL CHECK(json_valid(design)));
                CREATE TABLE workspace (id INTEGER PRIMARY KEY CHECK(id=1), design TEXT NOT NULL CHECK(json_valid(design)));
                CREATE TABLE restore_points (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, saved_at TEXT NOT NULL, design TEXT NOT NULL CHECK(json_valid(design)));").map_err(error)?;
            }
            tx.execute_batch("CREATE TABLE offline_preparations (project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE, design TEXT NOT NULL CHECK(json_valid(design)), prepared_at TEXT NOT NULL, manifest TEXT NOT NULL CHECK(json_valid(manifest))); PRAGMA user_version=2;").map_err(error)?;
            tx.commit().map_err(error)?;
        }
        Ok(Self {
            connection,
            manifest,
        })
    }
    fn design(&self, table: &str, column: &str, id: &str) -> Result<Value, String> {
        // Table and column are private constants supplied by this module.
        let sql = format!("SELECT design FROM {table} WHERE {column}=?");
        let row = self
            .connection
            .query_row(&sql, [id], |r| r.get::<_, String>(0))
            .optional()
            .map_err(error)?;
        parse(row.ok_or("Project or restore point is unavailable.")?)
    }
    pub fn snapshot(&self) -> Result<Value, String> {
        let mut query = self
            .connection
            .prepare("SELECT design FROM projects ORDER BY rowid DESC")
            .map_err(error)?;
        let designs = query
            .query_map([], |r| r.get::<_, String>(0))
            .map_err(error)?
            .map(|row| parse(row.map_err(error)?))
            .collect::<Result<Vec<_>, _>>()?;
        let draft = self
            .connection
            .query_row("SELECT design FROM workspace WHERE id=1", [], |r| {
                r.get::<_, String>(0)
            })
            .optional()
            .map_err(error)?
            .map(parse)
            .transpose()?
            .unwrap_or(Value::Null);
        let mut query = self
            .connection
            .prepare(
                "SELECT id, project_id, saved_at, design FROM restore_points ORDER BY rowid DESC",
            )
            .map_err(error)?;
        let points = query.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?, r.get::<_, String>(3)?))).map_err(error)?.map(|row| {
            let (id, project, saved, value) = row.map_err(error)?; let design = parse(value)?;
            Ok(json!({"id":id,"designId":project,"savedAt":saved,"designTitle":design["title"].as_str().filter(|s| !s.is_empty()).unwrap_or("Untitled"),"shapeCount":design["shapes"].as_array().map_or(0, Vec::len)}))
        }).collect::<Result<Vec<Value>, String>>()?;
        let mut query = self.connection.prepare("SELECT p.project_id, p.design, p.prepared_at, p.manifest, d.design FROM offline_preparations p JOIN projects d ON d.id=p.project_id").map_err(error)?;
        let preparations = query.query_map([], |r| Ok((r.get::<_, String>(0)?,r.get::<_, String>(1)?,r.get::<_, String>(2)?,r.get::<_, String>(3)?,r.get::<_, String>(4)?))).map_err(error)?.map(|row| {
            let (id, prepared, at, manifest, current) = row.map_err(error)?;
            let design = parse(prepared.clone())?; let manifest = parse(manifest)?;
            let mut limitations = vec![];
            if design.get("mapReference").is_some_and(|v| !v.is_null()) { limitations.push("map"); }
            if design["shapes"].as_array().is_some_and(|s| s.iter().any(|v| v.get("appearance").is_some_and(|a| !a.is_null()))) { limitations.push("appearance"); }
            let status = if !valid_manifest(&manifest) { "missing" } else if self.manifest.as_ref().is_none_or(|m| m["revision"] != manifest["revision"]) { "update" } else if digest(&current) != digest(&prepared) { "changed" } else if !limitations.is_empty() { "limited" } else { "ready" };
            Ok(json!({"projectId":id,"preparedAt":at,"designUpdatedAt":design["updatedAt"],"revision":digest(prepared),"status":status,"limitations":limitations}))
        }).collect::<Result<Vec<Value>, String>>()?;
        Ok(
            json!({"designs":designs,"draft":draft,"restorePoints":points,"offlinePreparations":preparations}),
        )
    }
    fn write(
        tx: &Transaction<'_>,
        design: &Value,
        restore: bool,
        activate: bool,
    ) -> Result<(), String> {
        let value = text(design)?;
        let id = design["id"].as_str().ok_or("Invalid project ID")?;
        if activate {
            tx.execute("INSERT INTO workspace VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET design=excluded.design", [&value]).map_err(error)?;
        }
        tx.execute("INSERT INTO projects VALUES(?, ?) ON CONFLICT(id) DO UPDATE SET design=excluded.design", params![id,value]).map_err(error)?;
        if restore {
            tx.execute(
                "INSERT INTO restore_points VALUES(?, ?, ?, ?)",
                params![Uuid::new_v4().to_string(), id, now(), value],
            )
            .map_err(error)?;
            tx.execute("DELETE FROM restore_points WHERE project_id=? AND id NOT IN (SELECT id FROM restore_points WHERE project_id=? ORDER BY rowid DESC LIMIT 10)", params![id,id]).map_err(error)?;
        }
        Ok(())
    }
    pub fn command(&mut self, name: &str, payload: &Value) -> Result<Value, String> {
        match name {
            "state" => return self.snapshot(),
            "save" | "save-copy" => {
                let design = &payload["design"];
                validate_design(design)?;
                let tx = self.connection.transaction().map_err(error)?;
                Self::write(
                    &tx,
                    design,
                    name == "save" && payload["restore"] == true,
                    name == "save",
                )?;
                tx.commit().map_err(error)?;
            }
            "rename" => {
                let id = payload["id"].as_str().ok_or("Invalid project ID")?;
                let title = payload["title"]
                    .as_str()
                    .filter(|s| s.chars().count() <= 500)
                    .ok_or("Invalid project title.")?;
                let mut design = self.design("projects", "id", id)?;
                design["title"] = title.into();
                design["updatedAt"] = now().into();
                validate_design(&design)?;
                let value = text(&design)?;
                let tx = self.connection.transaction().map_err(error)?;
                tx.execute(
                    "UPDATE projects SET design=? WHERE id=?",
                    params![value, id],
                )
                .map_err(error)?;
                tx.execute(
                    "UPDATE workspace SET design=? WHERE id=1 AND json_extract(design, '$.id')=?",
                    params![value, id],
                )
                .map_err(error)?;
                tx.commit().map_err(error)?;
            }
            "restore" => {
                let id = payload["id"].as_str().ok_or("Invalid restore point")?;
                let mut design = self.design("restore_points", "id", id)?;
                design["updatedAt"] = now().into();
                validate_design(&design)?;
                let current = self.snapshot()?["draft"].clone();
                let tx = self.connection.transaction().map_err(error)?;
                if !current.is_null() {
                    validate_design(&current)?;
                    Self::write(&tx, &current, true, true)?;
                }
                Self::write(&tx, &design, false, true)?;
                tx.commit().map_err(error)?;
            }
            "delete" => {
                let ids = payload["ids"]
                    .as_array()
                    .filter(|ids| ids.iter().all(Value::is_string))
                    .ok_or("Invalid project selection.")?;
                let tx = self.connection.transaction().map_err(error)?;
                for id in ids {
                    tx.execute("DELETE FROM projects WHERE id=?", [id.as_str().unwrap()])
                        .map_err(error)?;
                    tx.execute(
                        "DELETE FROM workspace WHERE json_extract(design, '$.id')=?",
                        [id.as_str().unwrap()],
                    )
                    .map_err(error)?;
                }
                tx.commit().map_err(error)?;
            }
            "delete-restore" => {
                self.connection
                    .execute(
                        "DELETE FROM restore_points WHERE id=?",
                        [payload["id"].as_str().ok_or("Invalid restore point")?],
                    )
                    .map_err(error)?;
            }
            "remove-offline" => {
                self.connection
                    .execute(
                        "DELETE FROM offline_preparations WHERE project_id=?",
                        [payload["id"].as_str().ok_or("Invalid project ID")?],
                    )
                    .map_err(error)?;
            }
            "prepare-offline" => {
                let id = payload["id"].as_str().ok_or("Invalid project ID")?;
                let design = self.design("projects", "id", id)?;
                let manifest = self
                    .manifest
                    .as_ref()
                    .ok_or("Offline preparation is unavailable. Rebuild Desktop Alpha.")?;
                if !valid_manifest(manifest) {
                    return Err("Offline preparation is unavailable.".into());
                }
                self.connection.execute("INSERT INTO offline_preparations VALUES(?, ?, ?, ?) ON CONFLICT(project_id) DO UPDATE SET design=excluded.design, prepared_at=excluded.prepared_at, manifest=excluded.manifest", params![id,text(&design)?,now(),text(manifest)?]).map_err(error)?;
            }
            _ => return Err("Unsupported desktop project operation.".into()),
        }
        self.snapshot()
    }
}
