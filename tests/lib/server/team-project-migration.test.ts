import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createMigratedDatabase } from "../../helpers/sqlite-d1";

it("preserves existing projects, shares, gallery, pending proposals and applied history with foreign keys enabled", () => {
  const db = createMigratedDatabase("0029_mcp_project_edits.sql");
  try {
    db.exec(`
      INSERT INTO users(id,email,createdAt,updatedAt) VALUES('user','user@example.invalid','2026-10-20','2026-10-20');
      INSERT INTO projects(id,owner_user_id,title,design_json,created_at,updated_at,revision)
        VALUES('project','user','Original','{"version":2}','2026-10-20','2026-10-20',7);
      INSERT INTO projects(id,owner_user_id,title,design_json,created_at,updated_at,archived_at)
        VALUES('archived','user','Archived','{}','2026-10-20','2026-10-20','2026-10-21');
      INSERT INTO shares(id,token,design_json,created_at,updated_at,published_at,owner_user_id,project_id)
        VALUES('share','canonical-token','{}','2026-10-20','2026-10-20','2026-10-20','user','project');
      INSERT INTO gallery_entries(id,share_token,owner_user_id,gallery_title,gallery_description,created_at,updated_at)
        VALUES('gallery','canonical-token','user','Published','Description','2026-10-20','2026-10-20');
      INSERT INTO mcp_project_edits(id,user_id,project_id,base_revision,before_json,after_json,changes_json,created_at,expires_at,applied_at,applied_revision)
        VALUES('applied','user','project',6,'{}','{}','[]','2026-10-20','2026-10-21','2026-10-20',7),
              ('pending','user','project',7,'{}','{}','[]','2026-10-20','2026-10-21',NULL,NULL);
    `);
    const snapshot = (table: string) =>
      db.prepare(`SELECT * FROM ${table} ORDER BY id`).all();
    const before = Object.fromEntries(
      ["projects", "shares", "gallery_entries", "mcp_project_edits"].map(
        (t) => [t, snapshot(t)]
      )
    );
    db.exec("BEGIN");
    db.exec(
      readFileSync(
        new URL(
          "../../../migrations/0030_team_project_ownership.sql",
          import.meta.url
        ),
        "utf8"
      )
    );
    db.exec("COMMIT");
    expect(db.prepare("PRAGMA foreign_keys").get()).toMatchObject({
      foreign_keys: 1,
    });
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    for (const table of ["shares", "gallery_entries", "mcp_project_edits"]) {
      expect(snapshot(table)).toEqual(before[table]);
    }
    expect(snapshot("projects")).toEqual(
      before.projects.map((p) => ({
        ...p,
        owner_team_id: null,
        created_by_user_id: "user",
      }))
    );
    expect(db.prepare("SELECT * FROM account_deletion_media").all()).toEqual(
      []
    );
    expect(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE name LIKE 'team_migration_%'"
        )
        .all()
    ).toEqual([]);
    db.exec("UPDATE projects SET title='Changed' WHERE id='project'");
    expect(
      db.prepare("SELECT revision FROM projects WHERE id='project'").get()
    ).toMatchObject({ revision: 8 });
    db.exec("DELETE FROM users WHERE id='user'");
    for (const table of [
      "projects",
      "shares",
      "gallery_entries",
      "mcp_project_edits",
    ]) {
      expect(snapshot(table)).toEqual([]);
    }
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    db.close();
  }
});
