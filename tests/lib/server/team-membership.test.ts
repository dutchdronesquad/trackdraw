import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ db: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.db }));
vi.mock("@/lib/server/team-mail", () => ({
  sendTeamInvitationEmail: mocks.send,
}));
import {
  executeTeamCommand as command,
  getTeamDetails,
  getTeamInvitationForUser,
  listTeams,
} from "@/lib/server/teams";
import { getAuthorizedTeam } from "@/lib/server/project-authorization";
import { cleanupInactiveAccounts } from "@/lib/server/account-deletion";
import { sendAccountRetentionNotices } from "@/lib/server/account-retention-notices";
let db: DatabaseSync, teamId: string;
function user(id: string, verified = 1) {
  db.prepare(
    "INSERT INTO users(id,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,?,?)"
  ).run(
    id,
    `${id}@example.invalid`,
    verified,
    new Date().toISOString(),
    new Date().toISOString()
  );
}
async function invite(
  email = "pilot@example.invalid",
  role: "editor" | "viewer" = "editor"
) {
  await command("owner", { action: "invite", teamId, email, role });
  return (await getTeamDetails("owner", teamId)).invitations.find(
    (i) => i.email === email.toLowerCase() && i.status === "pending"
  )!.id;
}
beforeEach(async () => {
  db = createMigratedDatabase();
  mocks.db.mockResolvedValue(sqliteD1(db));
  mocks.send.mockReset().mockResolvedValue(undefined);
  for (const id of ["owner", "pilot", "outsider"]) user(id);
  user("unverified", 0);
  teamId = (await command("owner", { action: "create", name: "Race team" }))
    .teamId;
});
afterEach(() => {
  db.close();
  vi.useRealTimers();
});
describe("team membership management", () => {
  it("creates an owner and renames only with live owner rights", async () => {
    expect((await listTeams("owner")).teams).toEqual([
      {
        id: teamId,
        name: "Race team",
        role: "owner",
        projectCount: 0,
        memberPreview: { total: 1, names: ["owner@example.invalid"] },
      },
    ]);
    await command("owner", { action: "rename", teamId, name: "Race crew" });
    expect((await getTeamDetails("owner", teamId)).name).toBe("Race crew");
    await expect(
      command("outsider", { action: "rename", teamId, name: "Stolen" })
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      command("unverified", { action: "create", name: "Unverified" })
    ).rejects.toMatchObject({ code: "verification" });
  });
  it("invites existing and new accounts without granting access before verified acceptance", async () => {
    const id = await invite("PILOT@EXAMPLE.INVALID");
    expect(mocks.send).toHaveBeenCalledWith(
      id,
      "pilot@example.invalid",
      "Race team"
    );
    expect((await listTeams("pilot")).teams).toEqual([]);
    expect((await listTeams("pilot")).invitations).toEqual([
      expect.objectContaining({ id, status: "pending", role: "editor" }),
    ]);
    await command("pilot", { action: "accept", invitationId: id });
    expect((await listTeams("pilot")).teams[0]).toMatchObject({
      id: teamId,
      role: "editor",
    });
    const lateId = await invite("late@example.invalid", "viewer");
    user("late");
    await command("late", { action: "accept", invitationId: lateId });
    expect((await listTeams("late")).teams[0].role).toBe("viewer");
  });
  it("opens an authorized invitation independently of recipient history limits", async () => {
    const id = await invite();
    const later = new Date(Date.now() + 1000).toISOString();
    for (let i = 0; i < 51; i++)
      db.prepare(
        "INSERT INTO team_invitations(id,organizationId,email,role,status,inviterId,expiresAt,createdAt) VALUES(?,?,?,'editor','canceled','owner',?,?)"
      ).run(`history-${i}`, teamId, "pilot@example.invalid", later, later);
    expect((await listTeams("pilot")).invitations).toHaveLength(50);
    expect(
      (await listTeams("pilot")).invitations.some((item) => item.id === id)
    ).toBe(false);
    expect(await getTeamInvitationForUser("pilot", id)).toMatchObject({
      id,
      status: "pending",
    });
    await expect(
      getTeamInvitationForUser("outsider", id)
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects wrong-account, unverified, expired, unknown and replayed acceptance", async () => {
    const id = await invite();
    await expect(
      command("outsider", { action: "accept", invitationId: id })
    ).rejects.toMatchObject({ code: "not_found" });
    const unverifiedId = await invite("unverified@example.invalid");
    await expect(
      command("unverified", { action: "accept", invitationId: unverifiedId })
    ).rejects.toMatchObject({ code: "verification" });
    db.prepare("UPDATE team_invitations SET expiresAt=? WHERE id=?").run(
      new Date(Date.now() - 1000).toISOString(),
      id
    );
    expect((await listTeams("pilot")).invitations[0].status).toBe("expired");
    await expect(
      command("pilot", { action: "accept", invitationId: id })
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      command("pilot", { action: "accept", invitationId: "missing" })
    ).rejects.toMatchObject({ code: "not_found" });
  });
  it("consumes a link exactly once under concurrent acceptance and cannot rejoin after removal", async () => {
    const id = await invite();
    const outcomes = await Promise.allSettled([
      command("pilot", { action: "accept", invitationId: id }),
      command("pilot", { action: "accept", invitationId: id }),
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM team_members WHERE userId='pilot'"
        )
        .get()
    ).toMatchObject({ count: 1 });
    expect(
      db.prepare("SELECT status FROM team_invitations WHERE id=?").get(id)
    ).toMatchObject({ status: "accepted" });
    await command("owner", { action: "remove", teamId, userId: "pilot" });
    await expect(
      command("pilot", { action: "accept", invitationId: id })
    ).rejects.toMatchObject({ code: "not_found" });
  });
  it("rotates a resend and revokes its predecessor, including after expiry", async () => {
    const oldId = await invite();
    db.prepare(
      "UPDATE team_invitations SET expiresAt='2000-01-01' WHERE id=?"
    ).run(oldId);
    await command("owner", { action: "resend", teamId, invitationId: oldId });
    const rows = (await getTeamDetails("owner", teamId)).invitations;
    const fresh = rows.find((i) => i.status === "pending")!;
    expect(fresh.id).not.toBe(oldId);
    expect(rows.find((i) => i.id === oldId)?.status).toBe("canceled");
    await expect(
      command("pilot", { action: "accept", invitationId: oldId })
    ).rejects.toMatchObject({ code: "not_found" });
    await command("owner", {
      action: "revoke",
      teamId,
      invitationId: fresh.id,
    });
    await expect(
      command("pilot", { action: "accept", invitationId: fresh.id })
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      command("owner", { action: "resend", teamId, invitationId: fresh.id })
    ).rejects.toMatchObject({ code: "not_found" });
  });
  it("does not accept undelivered/failed mail and allows a fresh retry", async () => {
    mocks.send.mockImplementationOnce(async (id: string) => {
      expect((await listTeams("pilot")).invitations[0].status).toBe("sending");
      await expect(
        command("pilot", { action: "accept", invitationId: id })
      ).rejects.toMatchObject({ code: "not_found" });
      throw new Error("private provider details");
    });
    await expect(invite()).rejects.toMatchObject({ code: "delivery" });
    expect(
      db.prepare("SELECT status,delivery_state FROM team_invitations").get()
    ).toMatchObject({ status: "canceled", delivery_state: "failed" });
    const id = await invite();
    await command("pilot", { action: "accept", invitationId: id });
  });
  it("limits owner visibility to the matching team and shows no member email roster to editors/viewers", async () => {
    await command("pilot", { action: "accept", invitationId: await invite() });
    await expect(getTeamDetails("outsider", teamId)).rejects.toMatchObject({
      code: "not_found",
    });
    expect(await getTeamDetails("pilot", teamId)).toMatchObject({
      role: "editor",
      members: [],
      invitations: [],
    });
    await expect(
      command("pilot", {
        action: "invite",
        teamId,
        email: "other@example.invalid",
        role: "viewer",
      })
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      command("pilot", {
        action: "role",
        teamId,
        userId: "owner",
        role: "viewer",
      })
    ).rejects.toMatchObject({ code: "not_found" });
  });
  it("enforces role downgrades/removal on the next project access check and permits leaving", async () => {
    await command("pilot", { action: "accept", invitationId: await invite() });
    const actor = { userId: "pilot", scope: { kind: "team" as const, teamId } };
    expect(await getAuthorizedTeam(actor, "update")).not.toBeNull();
    await command("owner", {
      action: "role",
      teamId,
      userId: "pilot",
      role: "viewer",
    });
    expect(await getAuthorizedTeam(actor, "update")).toBeNull();
    expect(await getAuthorizedTeam(actor, "read")).not.toBeNull();
    await command("pilot", { action: "leave", teamId });
    expect(await getAuthorizedTeam(actor, "read")).toBeNull();
    expect((await listTeams("pilot")).teams).toEqual([]);
  });
  it("cannot remove/demote/leave/delete the only owner through any database deletion path", async () => {
    await expect(
      command("owner", { action: "leave", teamId })
    ).rejects.toMatchObject({ code: "owner_required" });
    await expect(
      command("owner", { action: "remove", teamId, userId: "owner" })
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      command("owner", {
        action: "role",
        teamId,
        userId: "owner",
        role: "viewer",
      })
    ).rejects.toMatchObject({ code: "not_found" });
    expect(() => db.exec("DELETE FROM users WHERE id='owner'")).toThrow(
      /team_owner_required/
    );
    expect(() =>
      db.exec("UPDATE team_members SET role='viewer' WHERE userId='owner'")
    ).toThrow(/team_owner_required/);
    expect(
      db.prepare("SELECT id FROM users WHERE id='owner'").get()
    ).toBeTruthy();
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("excludes team owners from destructive inactivity cleanup and notices", async () => {
    db.exec(
      "UPDATE users SET last_active_at='2020-01-01T00:00:00.000Z' WHERE id='owner'"
    );
    const mailer = { isConfigured: () => true, send: vi.fn(async () => {}) };
    await sendAccountRetentionNotices(sqliteD1(db), { mailer });
    expect(mailer.send).not.toHaveBeenCalled();
    await cleanupInactiveAccounts(sqliteD1(db), null);
    expect(
      db.prepare("SELECT id FROM users WHERE id='owner'").get()
    ).toBeTruthy();
  });
  it("bounds create and invitation attempts and never grants membership on duplicates", async () => {
    for (let i = 0; i < 4; i++)
      await command("owner", { action: "create", name: `Team ${i}` });
    await expect(
      command("owner", { action: "create", name: "Sixth" })
    ).rejects.toMatchObject({ code: "limit" });
    for (let i = 0; i < 10; i++) await invite(`invite-${i}@example.invalid`);
    await expect(invite("eleventh@example.invalid")).rejects.toMatchObject({
      code: "limit",
      status: 429,
    });
    expect(mocks.send).toHaveBeenCalledTimes(10);
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM team_members WHERE organizationId=?"
        )
        .get(teamId)
    ).toMatchObject({ count: 1 });
  });
  it("rejects an owner role or unknown request fields at the command boundary", async () => {
    await expect(
      command("owner", {
        action: "invite",
        teamId,
        email: "pilot@example.invalid",
        role: "owner",
      })
    ).rejects.toMatchObject({ code: "invalid" });
    await expect(
      command("owner", { action: "create", name: "Team", userId: "outsider" })
    ).rejects.toMatchObject({ code: "invalid" });
  });
});

it("returns a bounded accepted-member preview only to the current owner", async () => {
  for (const id of ["pilot", "second", "third", "fourth"]) {
    if (id !== "pilot") user(id);
    db.prepare(
      "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES(?,?,?,'viewer',?)"
    ).run(id, teamId, id, new Date().toISOString());
  }
  await invite("unverified@example.invalid");
  const preview = (await listTeams("owner")).teams[0].memberPreview!;
  expect(preview.total).toBe(5);
  expect(preview.names).toHaveLength(3);
  expect(preview.names[0]).toBe("owner@example.invalid");
  expect(preview.names).not.toContain("unverified@example.invalid");
  expect((await listTeams("pilot")).teams[0]).not.toHaveProperty(
    "memberPreview"
  );
  expect((await listTeams("outsider")).teams).toEqual([]);
  await command("owner", { action: "transfer-owner", teamId, userId: "pilot" });
  expect((await listTeams("owner")).teams[0]).not.toHaveProperty(
    "memberPreview"
  );
  expect((await listTeams("pilot")).teams[0].memberPreview?.total).toBe(5);
});

it("counts only active projects in the member's own teams", async () => {
  const otherTeamId = (
    await command("outsider", { action: "create", name: "Other team" })
  ).teamId;
  const insert = db.prepare(
    "INSERT INTO projects(id,owner_team_id,owner_user_id,created_by_user_id,title,design_json,created_at,updated_at,archived_at) VALUES(?,?,?,?,?,'{}',?,?,?)"
  );
  const now = new Date().toISOString();
  insert.run("active", teamId, null, "owner", "Active", now, now, null);
  insert.run("archived", teamId, null, "owner", "Archived", now, now, now);
  insert.run("personal", null, "owner", "owner", "Personal", now, now, null);
  insert.run("other", otherTeamId, null, "outsider", "Other", now, now, null);
  const invitationId = await invite("pilot@example.invalid", "viewer");
  await command("pilot", { action: "accept", invitationId });
  expect((await listTeams("owner")).teams[0].projectCount).toBe(1);
  expect((await listTeams("pilot")).teams).toEqual([
    { id: teamId, name: "Race team", role: "viewer", projectCount: 1 },
  ]);
  expect((await listTeams("outsider")).teams).toHaveLength(1);
  expect((await listTeams("outsider")).teams[0].id).toBe(otherTeamId);
});
