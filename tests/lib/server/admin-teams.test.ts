import { beforeEach, afterEach, it, expect, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
vi.mock("server-only", () => ({}));
import {
  correctTeamOwner,
  listAdminTeams,
  readAdminTeam,
} from "@/lib/server/admin-teams";
let db: DatabaseSync;
beforeEach(() => {
  db = createMigratedDatabase();
  for (const [id, role] of [
    ["admin", "admin"],
    ["owner", "user"],
    ["editor", "user"],
    ["viewer", "user"],
    ["outsider", "user"],
  ])
    db.prepare(
      "INSERT INTO users(id,email,name,emailVerified,createdAt,updatedAt,role) VALUES(?,?,?,1,'2026-01-01','2026-01-01',?)"
    ).run(id, `${id}@example.invalid`, id, role);
  db.exec(
    "INSERT INTO teams(id,name,slug,createdAt) VALUES('team','Practice collective','practice','2026-01-01')"
  );
  for (const role of ["owner", "editor", "viewer"])
    db.prepare(
      "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES(?,'team',?,?,'2026-01-01')"
    ).run(role, role, role);
});
afterEach(() => db.close());
const change = (
  actor = "admin",
  targetId = "editor",
  ownerId: string | null = "owner"
) =>
  correctTeamOwner(sqliteD1(db), actor, {
    teamId: "team",
    ownerId,
    targetId,
    reason: "Reviewed support request",
  });
it("restricts team directory and private detail to administrators", async () => {
  await expect(listAdminTeams(sqliteD1(db), "viewer")).rejects.toThrow(
    "forbidden"
  );
  await expect(readAdminTeam(sqliteD1(db), "outsider", "team")).rejects.toThrow(
    "forbidden"
  );
  expect(
    (await listAdminTeams(sqliteD1(db), "admin", { search: "practice" })).teams
  ).toHaveLength(1);
  expect(
    (await listAdminTeams(sqliteD1(db), "admin", { search: "%" })).teams
  ).toHaveLength(0);
  expect(
    (await listAdminTeams(sqliteD1(db), "admin", { attention: true })).teams
  ).toHaveLength(0);
});
it("corrects an active team owner with a real admin actor, reason, and no residual bypass", async () => {
  await change();
  expect(
    db.prepare("SELECT userId FROM team_members WHERE role='owner'").get()
  ).toEqual({ userId: "editor" });
  const audit = db
    .prepare(
      "SELECT actor_user_id,metadata_json FROM audit_events WHERE event_type='team.owner_corrected'"
    )
    .get();
  expect(audit?.actor_user_id).toBe("admin");
  expect(JSON.parse(audit?.metadata_json as string)).toEqual({
    previousOwnerId: "owner",
    ownerId: "editor",
    reason: "Reviewed support request",
  });
  expect(db.prepare("SELECT * FROM team_admin_owner_changes").all()).toEqual(
    []
  );
  await expect(change("admin", "owner", "owner")).rejects.toThrow("conflict");
  expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});
it("denies outsiders, viewers, bans, missing reasons and stale-owner corrections without partial mutations", async () => {
  for (const actor of ["viewer", "outsider"])
    await expect(change(actor)).rejects.toThrow("forbidden");
  for (const target of ["viewer", "outsider"])
    await expect(change("admin", target)).rejects.toThrow("conflict");
  await expect(
    correctTeamOwner(sqliteD1(db), "admin", {
      teamId: "team",
      ownerId: "owner",
      targetId: "editor",
      reason: " ",
    })
  ).rejects.toThrow();
  db.exec("UPDATE users SET banned_at='2026-10-23' WHERE id='editor'");
  await expect(change()).rejects.toThrow("conflict");
  expect(
    db.prepare("SELECT userId FROM team_members WHERE role='owner'").get()
  ).toEqual({ userId: "owner" });
});
it("restores an ownerless team and refuses a correction after the fixed recovery deadline", async () => {
  db.exec(
    "INSERT INTO team_succession_cases(id,team_id,owner_id,activity_at,removal_at,opened_at,state,recovery_at,purge_at) VALUES('case','team',NULL,'2020-01-01','2026-10-01','2026-10-01','recovery','2026-10-01','2027-01-01')"
  );
  db.exec(
    "INSERT INTO team_retention_deletions(user_id,now) VALUES('owner','2026-10-23'); DELETE FROM users WHERE id='owner'"
  );
  await change("admin", "editor", null);
  expect(db.prepare("SELECT state FROM team_succession_cases").get()).toEqual({
    state: "resolved",
  });
  expect(
    db.prepare("SELECT userId FROM team_members WHERE role='owner'").get()
  ).toEqual({ userId: "editor" });
  db.exec(
    "UPDATE team_members SET role='editor' WHERE userId='viewer'; UPDATE team_succession_cases SET state='recovery',purge_at='2020-01-01'"
  );
  await expect(change("admin", "viewer", "editor")).rejects.toThrow("conflict");
});
