use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;
use std::{path::Path, time::Duration};

pub struct CloudRepository(Connection);

impl CloudRepository {
    pub fn open(path: &Path) -> Result<Self, String> {
        let db = Connection::open(path).map_err(|error| error.to_string())?;
        db.busy_timeout(Duration::from_secs(5))
            .and_then(|_| {
                db.execute_batch(
                    "PRAGMA journal_mode=WAL;
                    PRAGMA synchronous=FULL;
                    CREATE TABLE IF NOT EXISTS cloud_projects (
                        account_id TEXT NOT NULL,
                        team_id TEXT NOT NULL,
                        project_id TEXT NOT NULL,
                        state TEXT NOT NULL CHECK(json_valid(state)),
                        PRIMARY KEY(account_id, team_id, project_id)
                    );",
                )
            })
            .map_err(|error| error.to_string())?;
        Ok(Self(db))
    }

    pub fn list(&self, account: &str) -> Result<Value, String> {
        let mut query = self.0.prepare(
            "SELECT json_patch(
                json_remove(state, '$.design', '$.pending'),
                json_object('title',json_extract(state,'$.design.title'),'updatedAt',json_extract(state,'$.design.updatedAt'))
            ) FROM cloud_projects WHERE account_id=? ORDER BY project_id",
        ).map_err(|error| error.to_string())?;
        let rows = query
            .query_map([account], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?
            .map(|row| {
                serde_json::from_str(&row.map_err(|error| error.to_string())?)
                    .map_err(|error| error.to_string())
            })
            .collect::<Result<Vec<Value>, _>>()?;
        Ok(Value::Array(rows))
    }

    pub fn get(&self, account: &str, team: &str, project: &str) -> Result<Value, String> {
        self.0
            .query_row(
                "SELECT state FROM cloud_projects WHERE account_id=? AND team_id=? AND project_id=?",
                params![account, team, project],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|error| error.to_string())?
            .map(|value| serde_json::from_str(&value).map_err(|error| error.to_string()))
            .transpose()
            .map(|value| value.unwrap_or(Value::Null))
    }

    pub fn put(
        &self,
        account: &str,
        team: &str,
        project: &str,
        state: &Value,
    ) -> Result<(), String> {
        if state["accountId"] != account
            || state["projectId"] != project
            || state["design"]["id"] != project
            || state["team"]["id"].as_str().unwrap_or("") != team
            || (!state["pending"].is_null() && state["pending"]["design"]["id"] != project)
        {
            return Err("Invalid cloud project record.".into());
        }
        let serialized = serde_json::to_string(state).map_err(|error| error.to_string())?;
        if serialized.len() > 36 * 1024 * 1024 {
            return Err("Cloud project exceeds the desktop storage limit.".into());
        }
        self.0
            .execute(
                "INSERT INTO cloud_projects VALUES(?,?,?,?)
            ON CONFLICT(account_id,team_id,project_id) DO UPDATE SET state=excluded.state",
                params![account, team, project, serialized],
            )
            .map_err(|error| error.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::CloudRepository;
    use serde_json::json;

    #[test]
    fn retains_the_in_flight_snapshot_and_latest_draft_after_reopen() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("cloud.sqlite");
        let record = json!({
            "accountId": "pilot",
            "projectId": "track",
            "team": null,
            "design": { "id": "track", "title": "Latest edits" },
            "revision": 5,
            "dirty": true,
            "pending": { "revision": 5, "design": { "id": "track", "title": "Sent earlier" } }
        });
        CloudRepository::open(&path)
            .unwrap()
            .put("pilot", "", "track", &record)
            .unwrap();
        let reopened = CloudRepository::open(&path).unwrap();
        assert_eq!(reopened.get("pilot", "", "track").unwrap(), record);
        assert!(reopened
            .get("another-account", "", "track")
            .unwrap()
            .is_null());
        assert_eq!(reopened.list("pilot").unwrap()[0]["dirty"], true);
        assert!(reopened.list("pilot").unwrap()[0]["design"].is_null());
    }
}
