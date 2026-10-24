const { DatabaseSync } = require("node:sqlite");
const { randomUUID } = require("node:crypto");

function validateDesign(design) {
  if (
    !design ||
    design.version !== 2 ||
    typeof design.id !== "string" ||
    !design.id ||
    typeof design.title !== "string" ||
    !Array.isArray(design.shapes) ||
    !design.field
  )
    throw new Error("Invalid TrackDraw project.");
  if (Buffer.byteLength(JSON.stringify(design)) > 16 * 1024 * 1024)
    throw new Error("Project exceeds the 16 MiB desktop limit.");
}

function openRepository(filename) {
  const db = new DatabaseSync(filename);
  try {
    const version = db.prepare("PRAGMA user_version").get().user_version;
    if (version > 1)
      throw new Error(
        "This project database requires a newer TrackDraw version. No data was changed."
      );
    db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;"
    );
    if (version === 0) {
      db.exec(`BEGIN IMMEDIATE;
        CREATE TABLE projects (id TEXT PRIMARY KEY, design TEXT NOT NULL CHECK(json_valid(design)));
        CREATE TABLE workspace (id INTEGER PRIMARY KEY CHECK(id=1), design TEXT NOT NULL CHECK(json_valid(design)));
        CREATE TABLE restore_points (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, saved_at TEXT NOT NULL, design TEXT NOT NULL CHECK(json_valid(design)));
        PRAGMA user_version=1;
        COMMIT;`);
    }
  } catch (error) {
    db.close();
    throw error;
  }

  function transaction(action) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = action();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  function snapshot() {
    return {
      designs: db
        .prepare("SELECT design FROM projects ORDER BY rowid DESC")
        .all()
        .map((row) => JSON.parse(row.design)),
      draft: JSON.parse(
        db.prepare("SELECT design FROM workspace WHERE id=1").get()?.design ??
          "null"
      ),
      restorePoints: db
        .prepare(
          "SELECT id, project_id AS designId, saved_at AS savedAt, design FROM restore_points ORDER BY rowid DESC"
        )
        .all()
        .map((row) => {
          const design = JSON.parse(row.design);
          return {
            id: row.id,
            designId: row.designId,
            savedAt: row.savedAt,
            designTitle: design.title || "Untitled",
            shapeCount: design.shapes.length,
          };
        }),
    };
  }
  function writeDesign(design, restore, activate) {
    const text = JSON.stringify(design);
    if (activate)
      db.prepare(
        "INSERT INTO workspace VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET design=excluded.design"
      ).run(text);
    db.prepare(
      "INSERT INTO projects VALUES(?, ?) ON CONFLICT(id) DO UPDATE SET design=excluded.design"
    ).run(design.id, text);
    if (restore) {
      db.prepare("INSERT INTO restore_points VALUES(?, ?, ?, ?)").run(
        randomUUID(),
        design.id,
        new Date().toISOString(),
        text
      );
      db.prepare(
        "DELETE FROM restore_points WHERE project_id=? AND id NOT IN (SELECT id FROM restore_points WHERE project_id=? ORDER BY rowid DESC LIMIT 10)"
      ).run(design.id, design.id);
    }
  }
  function save(design, restore = false, activate = true) {
    validateDesign(design);
    transaction(() => writeDesign(design, restore, activate));
    return snapshot();
  }
  function command(name, payload) {
    if (name === "state") return snapshot();
    if (name === "save")
      return save(payload?.design, payload?.restore === true);
    if (name === "save-copy") return save(payload?.design, false, false);
    if (name === "restore") {
      const row = db
        .prepare("SELECT design FROM restore_points WHERE id=?")
        .get(String(payload?.id));
      if (!row) throw new Error("Restore point is unavailable.");
      const design = JSON.parse(row.design);
      const current = snapshot().draft;
      design.updatedAt = new Date().toISOString();
      validateDesign(design);
      transaction(() => {
        if (current) writeDesign(current, true, true);
        writeDesign(design, false, true);
      });
      return snapshot();
    }
    if (name === "rename") {
      const row = db
        .prepare("SELECT design FROM projects WHERE id=?")
        .get(String(payload?.id));
      if (!row) throw new Error("Project is unavailable.");
      if (typeof payload.title !== "string" || payload.title.length > 500)
        throw new Error("Invalid project title.");
      transaction(() => {
        const design = JSON.parse(row.design);
        design.title = payload.title;
        design.updatedAt = new Date().toISOString();
        const text = JSON.stringify(design);
        db.prepare("UPDATE projects SET design=? WHERE id=?").run(
          text,
          design.id
        );
        const draft = snapshot().draft;
        if (draft?.id === design.id)
          db.prepare("UPDATE workspace SET design=? WHERE id=1").run(text);
      });
      return snapshot();
    }
    if (name === "delete") {
      if (
        !Array.isArray(payload?.ids) ||
        payload.ids.some((id) => typeof id !== "string")
      )
        throw new Error("Invalid project selection.");
      transaction(() => {
        for (const id of payload.ids) {
          db.prepare("DELETE FROM projects WHERE id=?").run(id);
          db.prepare(
            "DELETE FROM workspace WHERE json_extract(design, '$.id')=?"
          ).run(id);
        }
      });
      return snapshot();
    }
    if (name === "delete-restore") {
      db.prepare("DELETE FROM restore_points WHERE id=?").run(
        String(payload?.id)
      );
      return snapshot();
    }
    throw new Error("Unsupported desktop project operation.");
  }
  return { command, close: () => db.close() };
}
module.exports = { openRepository };
