import { beforeEach, afterEach, it, expect, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
vi.mock("server-only", () => ({}));
const mockedDb = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: mockedDb.get }));
import { createTeamProject } from "@/lib/server/team-projects";
import { acquireProjectLease } from "@/lib/server/team-project-leases";
import { deleteUserAccount } from "@/lib/server/account-deletion";
import {
  deliverSuccessionNotices,
  advanceTeamSuccession,
} from "@/lib/server/team-succession-jobs";
import {
  executeSuccessionCommand,
  readSuccessionCases,
} from "@/lib/server/team-succession";
let db: DatabaseSync;
const at = "2026-10-22T00:00:00.000Z";
const later = (days: number) => new Date(Date.parse(at) + days * 86400000);
function command(
  actor: string | null,
  action: string,
  app: string | null = null,
  now = later(0)
) {
  return db
    .prepare(
      "INSERT INTO team_succession_commands(id,case_id,actor_id,action,application_id,reason,now) VALUES(?,?,?,?,?,?,?)"
    )
    .run(
      crypto.randomUUID(),
      "case",
      actor,
      action,
      app,
      "Verified delivery receipt",
      now.toISOString()
    );
}
function apps() {
  return db.prepare("SELECT * FROM team_succession_applications").all() as {
    id: string;
    user_id: string;
    response_at: string;
    withdrawn_at: string | null;
  }[];
}
function recovery() {
  db.exec(
    "INSERT INTO account_retention_notices(id,user_id,activity_at,stage,removal_at,sent_at) VALUES('first','owner','2020-01-01','first','2026-10-22','2026-09-01'),('final','owner','2020-01-01','final','2026-10-22','2026-10-01')"
  );
  return deleteUserAccount(sqliteD1(db), "owner", {
    activityAt: "2020-01-01",
    now: later(0),
  });
}
beforeEach(() => {
  db = createMigratedDatabase();
  mockedDb.get.mockResolvedValue(sqliteD1(db));
  for (const id of [
    "owner",
    "editor",
    "editor2",
    "viewer",
    "outsider",
    "admin",
  ])
    db.prepare(
      "INSERT INTO users(id,email,name,emailVerified,createdAt,updatedAt,last_active_at,role) VALUES(?,?,?,1,?,?,?,?)"
    ).run(
      id,
      `${id}@example.invalid`,
      id,
      at,
      at,
      id === "owner" ? "2020-01-01" : at,
      id === "admin" ? "admin" : "user"
    );
  db.exec(
    "INSERT INTO teams(id,name,slug,createdAt) VALUES('team','Club','club','2020-01-01')"
  );
  for (const id of ["owner", "editor", "editor2", "viewer"])
    db.prepare(
      "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES(?,?,?,?,?)"
    ).run(
      id,
      "team",
      id,
      id === "owner" ? "owner" : id === "viewer" ? "viewer" : "editor",
      at
    );
  db.prepare(
    "INSERT INTO team_succession_cases(id,team_id,owner_id,activity_at,removal_at,opened_at) VALUES('case','team','owner','2020-01-01',?,?)"
  ).run(at, at);
});
afterEach(() => {
  db.close();
});
it("snapshots accepted editors and prevents viewers, outsiders and new/rejoined members from applying", () => {
  for (const id of ["viewer", "outsider"])
    expect(() => command(id, "apply")).toThrow(/succession_invalid/);
  db.exec(
    "DELETE FROM team_members WHERE userId='editor'; INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES('rejoined','team','editor','editor','2026-10-22')"
  );
  expect(() => command("editor", "apply")).toThrow(/succession_invalid/);
  command("editor2", "apply");
  expect(apps()).toHaveLength(1);
  expect(
    db.prepare("SELECT * FROM team_succession_commands").all()
  ).toHaveLength(0);
});
it("starts 30 days only after all application notices are acknowledged and automatically transfers atomically", async () => {
  command("editor", "apply");
  const a = apps()[0];
  await advanceTeamSuccession(sqliteD1(db), later(31));
  expect(apps()[0].response_at).toBeNull();
  db.prepare(
    "UPDATE team_succession_notices SET sent_at=? WHERE application_id=?"
  ).run(at, a.id);
  await advanceTeamSuccession(sqliteD1(db), later(29));
  expect(
    db.prepare("SELECT role FROM team_members WHERE userId='editor'").get()
  ).toEqual({ role: "editor" });
  await advanceTeamSuccession(sqliteD1(db), later(30));
  expect(
    db.prepare("SELECT role FROM team_members WHERE userId='editor'").get()
  ).toEqual({ role: "owner" });
  expect(
    db.prepare("SELECT role FROM team_members WHERE userId='owner'").get()
  ).toEqual({ role: "editor" });
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});
it("awards the first completed eligible request without votes and resolves competing requests atomically", async () => {
  command("editor", "apply");
  command("editor2", "apply", null, later(1));
  const first = apps().find((a) => a.user_id === "editor")!;
  const second = apps().find((a) => a.user_id === "editor2")!;
  db.prepare(
    "UPDATE team_succession_applications SET response_at=? WHERE id=?"
  ).run(later(30).toISOString(), first.id);
  db.prepare(
    "UPDATE team_succession_applications SET response_at=? WHERE id=?"
  ).run(later(31).toISOString(), second.id);
  expect(() => command(null, "advance", second.id, later(32))).toThrow(
    /succession_invalid/
  );
  await advanceTeamSuccession(sqliteD1(db), later(32));
  expect(
    db.prepare("SELECT userId FROM team_members WHERE role='owner'").get()
  ).toEqual({ userId: "editor" });
  expect(() => command(null, "advance", second.id, later(33))).toThrow(
    /succession_invalid/
  );
  expect(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE name='team_succession_votes'"
      )
      .get()
  ).toBeUndefined();
});
it("allows the next completed eligible request after the first applicant withdraws", async () => {
  command("editor", "apply");
  command("editor2", "apply");
  command("editor", "withdraw");
  db.prepare(
    "UPDATE team_succession_notices SET sent_at=? WHERE event='application'"
  ).run(at);
  await advanceTeamSuccession(sqliteD1(db), later(31));
  expect(
    db.prepare("SELECT userId FROM team_members WHERE role='owner'").get()
  ).toEqual({ userId: "editor2" });
});
it("owner activity cancels the case and stale applications cannot transfer", () => {
  command("editor", "apply");
  db.prepare("UPDATE users SET last_active_at=? WHERE id='owner'").run(at);
  expect(() => command(null, "advance", apps()[0].id, later(40))).toThrow(
    /succession_invalid/
  );
  expect(() => command("editor2", "apply")).toThrow(/succession_invalid/);
});
it("ordinary deletion stays blocked, automatic deletion detaches team/publications and expires leases", async () => {
  db.exec(
    "INSERT INTO projects(id,owner_team_id,created_by_user_id,title,design_json,created_at,updated_at) VALUES('project','team','owner','Track','{}','2026-01-01','2026-01-01'); INSERT INTO shares(id,token,design_json,created_at,updated_at,owner_user_id,project_id,published_at) VALUES('share','token','{}','2026-01-01','2026-01-01','owner','project','2026-01-01'); INSERT INTO gallery_entries(id,share_token,owner_user_id,gallery_title,gallery_description,created_at,updated_at) VALUES('gallery','token','owner','Track','Track description','2026-01-01','2026-01-01')"
  );
  db.exec(
    "INSERT INTO project_edit_leases(project_id,user_id,session_id,expires_at) VALUES('project','editor','lease','2027-01-01')"
  );
  expect(() => db.exec("DELETE FROM users WHERE id='owner'")).toThrow(
    /team_owner_required/
  );
  expect(await recovery()).toBe(true);
  expect(
    db.prepare("SELECT * FROM users WHERE id='owner'").get()
  ).toBeUndefined();
  expect(
    db.prepare("SELECT owner_user_id FROM shares WHERE id='share'").get()
  ).toEqual({ owner_user_id: null });
  expect(
    db
      .prepare("SELECT owner_user_id FROM gallery_entries WHERE id='gallery'")
      .get()
  ).toEqual({ owner_user_id: null });
  expect(
    db.prepare("SELECT id FROM projects WHERE id='project'").get()
  ).toBeTruthy();
  expect(
    db
      .prepare(
        "SELECT state,purge_at FROM team_succession_cases WHERE id='case'"
      )
      .get()
  ).toEqual({ state: "recovery", purge_at: later(90).toISOString() });
  expect(() =>
    db.exec("UPDATE projects SET title='Lost' WHERE id='project'")
  ).toThrow(/team_read_only/);
  expect(() =>
    db.exec(
      "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES('new','team','outsider','editor','2026-10-22')"
    )
  ).toThrow(/team_read_only/);
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});
it("recovery transfer restores access and team publications without retaining deleted personal account", async () => {
  await recovery();
  command("editor", "apply");
  const a = apps()[0];
  db.prepare(
    "UPDATE team_succession_notices SET sent_at=? WHERE application_id=?"
  ).run(at, a.id);
  await advanceTeamSuccession(sqliteD1(db), later(30));
  expect(
    db.prepare("SELECT role FROM team_members WHERE userId='editor'").get()
  ).toEqual({ role: "owner" });
  expect(
    db.prepare("SELECT id FROM users WHERE id='owner'").get()
  ).toBeUndefined();
});
it("rejects late applications and holds final cleanup until both reminder lead times have elapsed", async () => {
  await recovery();
  expect(() => command("editor", "apply", null, later(61))).toThrow(
    /succession_invalid/
  );
  await expect(advanceTeamSuccession(sqliteD1(db), later(90))).rejects.toThrow(
    /reminders/
  );
  db.prepare(
    "UPDATE team_succession_notices SET sent_at=? WHERE event='reminder30'"
  ).run(later(61).toISOString());
  db.prepare(
    "UPDATE team_succession_notices SET sent_at=? WHERE event='reminder7'"
  ).run(later(84).toISOString());
  await expect(advanceTeamSuccession(sqliteD1(db), later(90))).rejects.toThrow(
    /reminders/
  );
  await advanceTeamSuccession(sqliteD1(db), later(91));
  expect(
    db.prepare("SELECT id FROM teams WHERE id='team'").get()
  ).toBeUndefined();
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});
it("notices use durable claims, safe idempotency and a bounded send batch", async () => {
  const mailer = { isConfigured: () => true, send: vi.fn(async () => {}) };
  await deliverSuccessionNotices(sqliteD1(db), mailer, later(0));
  expect(mailer.send).toHaveBeenCalledTimes(2);

  await deliverSuccessionNotices(sqliteD1(db), mailer, later(0));
  expect(mailer.send).toHaveBeenCalledTimes(4);
});
it("case lists do not expose teams or applications to outsiders and server commands deny non-admin review", async () => {
  expect(await readSuccessionCases(sqliteD1(db), "outsider")).toEqual([]);
  expect(await readSuccessionCases(sqliteD1(db), "viewer")).toHaveLength(1);
  await expect(
    executeSuccessionCommand(sqliteD1(db), "viewer", {
      caseId: "case",
      action: "confirm-notice",
    })
  ).rejects.toThrow(/forbidden/);
});
it("rechecks owner sessions, applicant bans, and current membership at the atomic transfer boundary", () => {
  command("editor", "apply");
  const a = apps()[0];
  db.exec(
    "INSERT INTO sessions(id,token,userId,expiresAt,createdAt,updatedAt) VALUES('session','token','owner','2027-01-01','2026-01-01','2026-01-01')"
  );
  expect(() => command(null, "advance", a.id, later(31))).toThrow(
    /succession_invalid/
  );
  db.exec(
    "DELETE FROM sessions; UPDATE users SET banned_at='2026-10-22' WHERE id='editor'"
  );
  expect(() => command("admin", "advance", a.id)).toThrow(/succession_invalid/);
  expect(apps()[0].withdrawn_at).toBeTruthy();
});
it("new accepted members are notified, cannot become applicants, without changing an existing request", () => {
  command("editor", "apply");
  db.exec(
    "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES('new','team','outsider','editor','2026-10-22')"
  );
  expect(
    db
      .prepare(
        "SELECT count(*) AS n FROM team_succession_notices WHERE user_id='outsider'"
      )
      .get()
  ).toEqual({ n: 2 });
  expect(() => command("outsider", "apply")).toThrow(/succession_invalid/);
});
it("no-member teams expire after 90 days without inventing a successor", async () => {
  db.exec("DELETE FROM team_members WHERE role<>'owner'");
  await recovery();
  await advanceTeamSuccession(sqliteD1(db), later(89));
  expect(db.prepare("SELECT id FROM teams WHERE id='team'").get()).toBeTruthy();
  await advanceTeamSuccession(sqliteD1(db), later(90));
  expect(
    db.prepare("SELECT id FROM teams WHERE id='team'").get()
  ).toBeUndefined();
});
it("uncertain delivery is not replayed outside the provider window and requires audited administrator receipt confirmation", async () => {
  const notice = db
    .prepare("SELECT id FROM team_succession_notices WHERE user_id='editor'")
    .get() as { id: string };
  db.prepare(
    "UPDATE team_succession_notices SET attempted_at=?,due_at='2000-01-01' WHERE id=?"
  ).run(later(-2).toISOString(), notice.id);
  const mailer = { isConfigured: () => true, send: vi.fn(async () => {}) };
  await expect(
    deliverSuccessionNotices(sqliteD1(db), mailer, later(0))
  ).rejects.toThrow(/uncertain/);
  db.prepare("UPDATE team_succession_notices SET uncertain=1 WHERE id=?").run(
    notice.id
  );
  await expect(
    executeSuccessionCommand(sqliteD1(db), "editor", {
      caseId: "case",
      action: "confirm-notice",
      noticeId: notice.id,
      reason: "provider receipt",
    })
  ).rejects.toThrow(/forbidden/);
  await executeSuccessionCommand(
    sqliteD1(db),
    "admin",
    {
      caseId: "case",
      action: "confirm-notice",
      noticeId: notice.id,
      reason: "Verified provider receipt test-123",
    },
    true
  );
  expect(
    db
      .prepare("SELECT sent_at FROM team_succession_notices WHERE id=?")
      .get(notice.id)?.sent_at
  ).toBeTruthy();
  expect(
    db
      .prepare(
        "SELECT event_type FROM audit_events WHERE event_type='team.succession.confirm-notice'"
      )
      .get()
  ).toBeTruthy();
});
it("rejects removed voting and manual approval actions at the public command boundary", async () => {
  for (const action of ["object", "consent", "approve", "reject"])
    await expect(
      executeSuccessionCommand(
        sqliteD1(db),
        "admin",
        { caseId: "case", action },
        true
      )
    ).rejects.toThrow(/invalid/);
});
it("read-only membership blocks manual removal while normal member account deletion still works", async () => {
  await recovery();
  expect(() =>
    db.exec("DELETE FROM team_members WHERE userId='viewer'")
  ).toThrow(/team_read_only/);
  expect(await deleteUserAccount(sqliteD1(db), "viewer")).toBe(true);
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});

it("recovery project creation and editing return normal authorization errors without database exceptions", async () => {
  await recovery();
  await expect(
    createTeamProject("editor", "team", "Must not exist")
  ).rejects.toMatchObject({ code: "not_found" });
  await expect(
    acquireProjectLease("editor", "team", "missing")
  ).rejects.toMatchObject({ code: "lease_unavailable" });
  expect(
    db
      .prepare(
        "SELECT count(*) AS count FROM projects WHERE owner_team_id='team'"
      )
      .get()
  ).toEqual({ count: 0 });
});
it("migration preserves existing gallery data and media queue when making manager attribution nullable", async () => {
  const { readFileSync } = await import("node:fs");
  const old = createMigratedDatabase("0035_team_ownership_lifecycle.sql");
  try {
    old.exec(
      "INSERT INTO users(id,email,emailVerified,createdAt,updatedAt) VALUES('pilot','pilot@example.invalid',1,'2026-01-01','2026-01-01'); INSERT INTO shares(id,token,owner_user_id,design_json,created_at,updated_at,published_at) VALUES('share','token','pilot','{}','2026-01-01','2026-01-01','2026-01-01'); INSERT INTO gallery_entries(id,share_token,owner_user_id,gallery_title,gallery_description,gallery_preview_image,created_at,updated_at) VALUES('gallery','token','pilot','Track','Description','gallery/previews/custom.webp','2026-01-01','2026-01-01')"
    );
    old.exec("BEGIN");
    old.exec(
      readFileSync(
        new URL(
          "../../../migrations/0036_team_inactivity_succession.sql",
          import.meta.url
        ),
        "utf8"
      )
    );
    old.exec("COMMIT");
    expect(
      old
        .prepare(
          "SELECT id,owner_user_id,gallery_preview_image FROM gallery_entries"
        )
        .all()
    ).toEqual([
      {
        id: "gallery",
        owner_user_id: "pilot",
        gallery_preview_image: "gallery/previews/custom.webp",
      },
    ]);
    expect(old.prepare("SELECT * FROM account_deletion_media").all()).toEqual(
      []
    );
    expect(old.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    old.exec("DELETE FROM gallery_entries WHERE id='gallery'");
    expect(
      old.prepare("SELECT count(*) AS n FROM account_deletion_media").get()
    ).toEqual({ n: 2 });
  } finally {
    old.close();
  }
});
it("allows only an audited administrator retry of a provider-verified unsent notice with a new delivery generation", async () => {
  const notice = db
    .prepare("SELECT id FROM team_succession_notices WHERE user_id='editor'")
    .get() as { id: string };
  db.prepare(
    "UPDATE team_succession_notices SET uncertain=1,attempted_at='2020-01-01',due_at='2000-01-01' WHERE id=?"
  ).run(notice.id);
  await expect(
    executeSuccessionCommand(sqliteD1(db), "viewer", {
      caseId: "case",
      action: "retry-notice",
      noticeId: notice.id,
      reason: "Not accepted by provider",
    })
  ).rejects.toThrow(/forbidden/);
  await executeSuccessionCommand(
    sqliteD1(db),
    "admin",
    {
      caseId: "case",
      action: "retry-notice",
      noticeId: notice.id,
      reason: "Verified provider never accepted the previous request",
    },
    true
  );
  expect(
    db
      .prepare(
        "SELECT uncertain,attempted_at,attempt_generation FROM team_succession_notices WHERE id=?"
      )
      .get(notice.id)
  ).toEqual({ uncertain: 0, attempted_at: null, attempt_generation: 1 });
  const send = vi.fn(async (_input: unknown) => {});
  await deliverSuccessionNotices(
    sqliteD1(db),
    { isConfigured: () => true, send },
    later(0)
  );
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      idempotencyKey: `team-succession-${notice.id}-1`,
    })
  );
});
it("final recovery cleanup revokes shares, purges only team content and queues gallery media", async () => {
  db.exec(
    "INSERT INTO projects(id,owner_team_id,created_by_user_id,title,design_json,created_at,updated_at) VALUES('project','team','owner','Track','{}','2026-01-01','2026-01-01'); INSERT INTO shares(id,token,owner_user_id,project_id,design_json,created_at,updated_at,published_at) VALUES('share','token','owner','project','{}','2026-01-01','2026-01-01','2026-01-01'); INSERT INTO gallery_entries(id,share_token,owner_user_id,gallery_title,gallery_description,created_at,updated_at) VALUES('gallery','token','owner','Track','Description','2026-01-01','2026-01-01')"
  );
  db.exec(
    "INSERT INTO project_edit_leases(project_id,user_id,session_id,expires_at) VALUES('project','editor','lease','2027-01-01')"
  );
  await recovery();
  expect(db.prepare("SELECT * FROM project_edit_leases").all()).toEqual([]);
  db.prepare(
    "UPDATE team_succession_notices SET sent_at=? WHERE event='reminder30'"
  ).run(later(60).toISOString());
  db.prepare(
    "UPDATE team_succession_notices SET sent_at=? WHERE event='reminder7'"
  ).run(later(83).toISOString());
  await advanceTeamSuccession(sqliteD1(db), later(90));
  for (const table of ["teams", "projects", "shares", "gallery_entries"])
    expect(db.prepare(`SELECT * FROM ${table}`).all()).toEqual([]);
  expect(db.prepare("SELECT * FROM account_deletion_media").all()).toHaveLength(
    1
  );
  expect(
    db.prepare("SELECT id FROM users WHERE id='viewer'").get()
  ).toBeTruthy();
});
it("rotates blocked cleanup cases so overdue teams later in the bounded backlog still get processed", async () => {
  for (let i = 0; i < 3; i++) {
    db.prepare("INSERT INTO teams(id,name,slug,createdAt) VALUES(?,?,?,?)").run(
      `backlog-${i}`,
      `Backlog ${i}`,
      `backlog-${i}`,
      at
    );
    if (i < 2)
      db.prepare(
        "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES(?,?,'viewer','viewer',?)"
      ).run(`backlog-member-${i}`, `backlog-${i}`, at);
    db.prepare(
      "INSERT INTO team_succession_cases(id,team_id,activity_at,removal_at,state,opened_at,recovery_at,purge_at) VALUES(?,?,?,?,'recovery',?,?,?)"
    ).run(
      `backlog-case-${i}`,
      `backlog-${i}`,
      at,
      at,
      at,
      later(-100).toISOString(),
      later(-10).toISOString()
    );
  }
  await expect(advanceTeamSuccession(sqliteD1(db), later(0))).rejects.toThrow(
    /reminders/
  );
  await expect(advanceTeamSuccession(sqliteD1(db), later(1))).rejects.toThrow(
    /reminders/
  );
  expect(
    db.prepare("SELECT id FROM teams WHERE id='backlog-2'").get()
  ).toBeUndefined();
  expect(
    db.prepare("SELECT id FROM teams WHERE id='backlog-0'").get()
  ).toBeTruthy();
});
