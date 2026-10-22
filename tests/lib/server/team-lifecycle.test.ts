import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { createDefaultDesign } from "@/lib/track/design";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.db }));
vi.mock("@/lib/server/team-mail", () => ({ sendTeamInvitationEmail: vi.fn() }));
import {
  executeTeamCommand as command,
  getTeamDetails,
  listTeams,
} from "@/lib/server/teams";
import { getProjectForActor } from "@/lib/server/projects";
import {
  acquireProjectLease,
  saveTeamProject,
} from "@/lib/server/team-project-leases";
import {
  changeTeamPublication,
  readTeamPublication,
} from "@/lib/server/team-project-publication";
import {
  deleteUserAccount,
  cleanupInactiveAccounts,
} from "@/lib/server/account-deletion";
let db: DatabaseSync;
const now = () => new Date().toISOString();
function project(id: string, teamId: string | null, creator = "editor") {
  db.prepare(
    `INSERT INTO projects(id,owner_team_id,owner_user_id,created_by_user_id,title,design_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`
  ).run(
    id,
    teamId,
    teamId ? null : creator,
    creator,
    id,
    JSON.stringify(createDefaultDesign()),
    now(),
    now()
  );
}
beforeEach(async () => {
  db = createMigratedDatabase();
  mocks.db.mockResolvedValue(sqliteD1(db));
  for (const id of ["owner", "editor", "viewer", "outsider"])
    db.prepare(
      "INSERT INTO users(id,email,emailVerified,createdAt,updatedAt) VALUES(?,?,1,?,?)"
    ).run(id, `${id}@example.invalid`, now(), now());
  for (const team of ["club", "other"])
    db.prepare("INSERT INTO teams(id,name,slug,createdAt) VALUES(?,?,?,?)").run(
      team,
      team,
      team,
      now()
    );
  for (const role of ["owner", "editor", "viewer"])
    db.prepare(
      "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES(?,'club',?,?,?)"
    ).run(role, role, role, now());
  db.prepare(
    "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES('other','other','outsider','owner',?)"
  ).run(now());
  project("race", "club");
  project("other-race", "other", "outsider");
  project("personal", null);
});
afterEach(() => db.close());
describe("team ownership lifecycle", () => {
  it("transfers exactly one owner, consumes the command, updates live rights and expires affected leases", async () => {
    const { lease } = await acquireProjectLease("owner", "club", "race");
    await command("owner", {
      action: "transfer-owner",
      teamId: "club",
      userId: "viewer",
    });
    const roles = db
      .prepare(
        "SELECT userId,role FROM team_members WHERE organizationId='club'"
      )
      .all();
    expect(roles).toContainEqual({ userId: "viewer", role: "owner" });
    expect(roles).toContainEqual({ userId: "owner", role: "editor" });
    expect(
      db
        .prepare(
          "SELECT count(*) AS n FROM team_members WHERE organizationId='club' AND role='owner'"
        )
        .get()
    ).toEqual({ n: 1 });
    expect(
      db.prepare("SELECT count(*) AS n FROM team_owner_transfers").get()
    ).toEqual({ n: 0 });
    expect(
      db.prepare("SELECT count(*) AS n FROM project_edit_leases").get()
    ).toEqual({ n: 0 });
    await expect(
      command("owner", { action: "rename", teamId: "club", name: "stolen" })
    ).rejects.toMatchObject({ code: "not_found" });
    await command("viewer", {
      action: "rename",
      teamId: "club",
      name: "New club",
    });
    await expect(
      saveTeamProject("owner", "club", "race", lease.sessionId, 1, {
        ...createDefaultDesign(),
        id: "race",
      })
    ).rejects.toBeDefined();
    expect(
      db
        .prepare(
          "SELECT count(*) AS n FROM audit_events WHERE event_type='team.ownership_transferred'"
        )
        .get()
    ).toEqual({ n: 1 });
  });
  it.each(["editor", "viewer", "outsider"])(
    "rejects transfer by %s",
    async (actor) => {
      await expect(
        command(actor, {
          action: "transfer-owner",
          teamId: "club",
          userId: "viewer",
        })
      ).rejects.toMatchObject({ code: "not_found" });
    }
  );
  it("rejects self, outsiders, invitations and unverified/banned targets without losing the owner", async () => {
    for (const userId of ["owner", "outsider"])
      await expect(
        command("owner", { action: "transfer-owner", teamId: "club", userId })
      ).rejects.toMatchObject({ code: "transfer_invalid" });
    db.prepare("UPDATE users SET emailVerified=0 WHERE id='editor'").run();
    await expect(
      command("owner", {
        action: "transfer-owner",
        teamId: "club",
        userId: "editor",
      })
    ).rejects.toMatchObject({ code: "transfer_invalid" });
    db.prepare("UPDATE users SET banned_at=? WHERE id='viewer'").run(now());
    await expect(
      command("owner", {
        action: "transfer-owner",
        teamId: "club",
        userId: "viewer",
      })
    ).rejects.toMatchObject({ code: "transfer_invalid" });
    expect((await getTeamDetails("owner", "club")).role).toBe("owner");
    expect(() =>
      db
        .prepare("UPDATE team_members SET role='editor' WHERE userId='owner'")
        .run()
    ).toThrow("team_owner_required");
    expect(() =>
      db.prepare("DELETE FROM users WHERE id='owner'").run()
    ).toThrow("team_owner_required");
  });
  it("preserves projects and public snapshots after transfer, former-owner deletion and creator departure", async () => {
    const published = await changeTeamPublication("owner", {
      action: "publish",
      teamId: "club",
      projectId: "race",
      revision: 1,
    });
    await changeTeamPublication("owner", {
      action: "list",
      teamId: "club",
      projectId: "race",
      token: published!.token,
      title: "Public race",
      description: "Public team race",
    });
    await command("owner", {
      action: "transfer-owner",
      teamId: "club",
      userId: "viewer",
    });
    expect(await deleteUserAccount(sqliteD1(db), "owner")).toBe(true);
    await command("editor", { action: "leave", teamId: "club" });
    expect(await deleteUserAccount(sqliteD1(db), "editor")).toBe(true);
    expect(
      await getProjectForActor("race", {
        userId: "viewer",
        scope: { kind: "team", teamId: "club" },
      })
    ).toBeTruthy();
    expect(
      db
        .prepare("SELECT created_by_user_id FROM projects WHERE id='race'")
        .get()
    ).toEqual({ created_by_user_id: null });
    expect(
      (await readTeamPublication("viewer", "club", "race")).shares[0].token
    ).toBe(published!.token);
    expect(
      db
        .prepare("SELECT owner_user_id FROM shares WHERE token=?")
        .get(published!.token)
    ).toEqual({ owner_user_id: "viewer" });
    expect(
      db
        .prepare(
          "SELECT owner_user_id FROM gallery_entries WHERE share_token=?"
        )
        .get(published!.token)
    ).toEqual({ owner_user_id: "viewer" });
  });
  it("reviews deletion impact and rejects stale reviews or incorrect confirmation", async () => {
    const impact = (await getTeamDetails("owner", "club")).deletionImpact!;
    expect(impact.projects).toBe(1);
    await expect(
      command("owner", {
        action: "delete",
        teamId: "club",
        confirmation: "wrong",
        impact,
      })
    ).rejects.toMatchObject({ code: "impact_changed" });
    project("new-race", "club");
    await expect(
      command("owner", {
        action: "delete",
        teamId: "club",
        confirmation: "club",
        impact,
      })
    ).rejects.toMatchObject({ code: "impact_changed" });
    expect((await listTeams("owner")).teams).toHaveLength(1);
  });
  it("deletes only the reviewed team, all public routes, invitations and leases; queues media cleanup", async () => {
    const published = await changeTeamPublication("owner", {
      action: "publish",
      teamId: "club",
      projectId: "race",
      revision: 1,
    });
    await changeTeamPublication("owner", {
      action: "list",
      teamId: "club",
      projectId: "race",
      token: published!.token,
      title: "Public race",
      description: "Public team race",
    });
    await acquireProjectLease("editor", "club", "race");
    db.prepare(
      "INSERT INTO team_invitations(id,organizationId,email,role,status,inviterId,expiresAt,createdAt) VALUES('invite','club','outsider@example.invalid','viewer','pending','owner',?,?)"
    ).run(new Date(Date.now() + 86400000).toISOString(), now());
    const impact = (await getTeamDetails("owner", "club")).deletionImpact!;
    expect(impact).toMatchObject({
      projects: 1,
      members: 3,
      invitations: 1,
      shares: 1,
      galleryEntries: 1,
      editingSessions: 1,
    });
    await command("owner", {
      action: "delete",
      teamId: "club",
      confirmation: "club",
      impact,
    });
    for (const table of [
      "team_invitations",
      "project_edit_leases",
      "shares",
      "gallery_entries",
    ])
      expect(db.prepare(`SELECT count(*) AS n FROM ${table}`).get()).toEqual({
        n: 0,
      });
    expect(db.prepare("SELECT id FROM projects ORDER BY id").all()).toEqual([
      { id: "other-race" },
      { id: "personal" },
    ]);
    expect(db.prepare("SELECT id FROM teams").all()).toEqual([{ id: "other" }]);
    expect(
      db.prepare("SELECT count(*) AS n FROM account_deletion_media").get()
    ).toEqual({ n: 1 });
    await expect(
      command("outsider", { action: "accept", invitationId: "invite" })
    ).rejects.toMatchObject({ code: "not_found" });
    expect(await deleteUserAccount(sqliteD1(db), "owner")).toBe(true);
  });
  it("keeps owner accounts out of inactivity deletion", async () => {
    db.prepare(
      "UPDATE users SET last_active_at='2020-01-01T00:00:00.000Z'"
    ).run();
    await cleanupInactiveAccounts(sqliteD1(db), null);
    expect(db.prepare("SELECT id FROM users WHERE id='owner'").get()).toEqual({
      id: "owner",
    });
  });
});

it("rolls transfer and deletion back when their audit record cannot be committed", async () => {
  db.exec(
    `CREATE TRIGGER block_lifecycle_audit BEFORE INSERT ON audit_events WHEN NEW.event_type IN ('team.ownership_transferred','team.deleted') BEGIN SELECT RAISE(ABORT,'audit_unavailable'); END`
  );
  await expect(
    command("owner", {
      action: "transfer-owner",
      teamId: "club",
      userId: "editor",
    })
  ).rejects.toThrow();
  expect((await getTeamDetails("owner", "club")).role).toBe("owner");
  expect(
    db.prepare("SELECT count(*) AS n FROM team_owner_transfers").get()
  ).toEqual({ n: 0 });
  const impact = (await getTeamDetails("owner", "club")).deletionImpact!;
  await expect(
    command("owner", {
      action: "delete",
      teamId: "club",
      confirmation: "club",
      impact,
    })
  ).rejects.toThrow();
  expect(db.prepare("SELECT id FROM projects WHERE id='race'").get()).toEqual({
    id: "race",
  });
});

it("does not delete a team for editors, viewers or outsiders", async () => {
  const impact = (await getTeamDetails("owner", "club")).deletionImpact!;
  for (const actor of ["editor", "viewer", "outsider"])
    await expect(
      command(actor, {
        action: "delete",
        teamId: "club",
        confirmation: "club",
        impact,
      })
    ).rejects.toMatchObject({ code: "not_found" });
});
