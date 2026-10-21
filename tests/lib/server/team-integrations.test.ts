import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import type { ApiIdentity } from "@/lib/server/api-keys";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  auth: vi.fn(),
  media: vi.fn(),
}));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.db }));
vi.mock("@/lib/server/api-v1", async (original) => ({
  ...(await original<typeof import("@/lib/server/api-v1")>()),
  authenticateApiRequest: mocks.auth,
}));
vi.mock("@/lib/server/api-keys", () => ({
  getApiIdentityFromBearerKey: vi.fn(),
}));
vi.mock("@/lib/server/gallery-media", () => ({
  deleteGalleryPreviewImage: mocks.media,
}));
vi.mock("@/lib/server/shares", () => ({ revokeSharesForProject: vi.fn() }));
import {
  externalProject,
  externalProjectList,
} from "@/lib/server/external-projects";
import {
  createExternalProject,
  updateExternalProject,
  archiveExternalProject,
  externalEditing,
} from "@/lib/server/external-project-mutations";
import {
  acquireProjectLease,
  releaseProjectLease,
} from "@/lib/server/team-project-leases";
import {
  previewProjectEdit,
  applyProjectEdit,
} from "@/lib/server/project-edits";
import { mcpTeamActor } from "@/lib/server/mcp/project-context";
let db: ReturnType<typeof createMigratedDatabase>;
let design: ReturnType<typeof createDefaultDesign>;
const actor = {
  userId: "editor",
  scope: { kind: "team" as const, teamId: "club" },
};
function identity(
  user = "editor",
  access: object = { mode: "all", teamId: "club" }
) {
  return {
    user: { id: user, email: null, name: null },
    key: { metadata: { projectAccess: access } },
  } as unknown as ApiIdentity;
}
const request = (data?: unknown, team = "club") =>
  new Request(`https://trackdraw.app/api/v1/projects/race?team_id=${team}`, {
    method: data ? "POST" : "GET",
    body: data ? JSON.stringify(data) : undefined,
  });
const context = { params: Promise.resolve({ projectId: "race" }) };
beforeEach(() => {
  db = createMigratedDatabase();
  mocks.db.mockResolvedValue(sqliteD1(db));
  const now = new Date().toISOString();
  for (const id of ["owner", "editor", "viewer", "outsider"])
    db.prepare(
      "INSERT INTO users(id,email,createdAt,updatedAt) VALUES(?,?,?,?)"
    ).run(id, `${id}@example.invalid`, now, now);
  db.prepare(
    "INSERT INTO teams(id,name,slug,createdAt) VALUES('club','Club','club',?)"
  ).run(now);
  for (const role of ["owner", "editor", "viewer"])
    db.prepare(
      "INSERT INTO team_members(id,organizationId,userId,role,createdAt) VALUES(?,'club',?,?,?)"
    ).run(role, role, role, now);
  design = {
    ...createDefaultDesign(),
    id: "race",
    title: "Race",
    shapeOrder: ["gate"],
    shapeById: {
      gate: {
        id: "gate",
        kind: "gate",
        x: 5,
        y: 5,
        width: 2,
        height: 2,
        rotation: 0,
      },
    },
  };
  for (const id of ["race", "other"])
    db.prepare(
      "INSERT INTO projects(id,owner_team_id,created_by_user_id,title,design_json,created_at,updated_at) VALUES(?,'club','owner',?,?,?,?)"
    ).run(id, id, JSON.stringify(serializeDesign({ ...design, id })), now, now);
  mocks.auth.mockResolvedValue({ ok: true, identity: identity() });
});
afterEach(() => {
  db.close();
  vi.clearAllMocks();
});
describe("individual integrations in explicit team context", () => {
  it("keeps old credentials personal and requires exact team selection", async () => {
    await expect(
      externalProject(request(), identity("editor", { mode: "all" }), "race")
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      externalProject(
        new Request("https://trackdraw.app/api/v1/projects/race"),
        identity(),
        "race"
      )
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      externalProject(request(undefined, "other"), identity(), "race")
    ).rejects.toMatchObject({ code: "not_found" });
    expect(mcpTeamActor("editor", undefined, false)).toBeUndefined();
    expect(() => mcpTeamActor("editor", "club", false)).toThrow(/teams:access/);
  });
  it("intersects selected projects with live team membership before pagination and every read", async () => {
    const key = identity("viewer", {
      mode: "selected",
      teamId: "club",
      projectIds: ["race"],
    });
    expect(
      (await externalProjectList(request(), key, 1)).map((p) => p.id)
    ).toEqual(["race"]);
    expect((await externalProject(request(), key, "race")).id).toBe("race");
    await expect(
      externalProject(request(), key, "other")
    ).rejects.toMatchObject({ code: "not_found" });
    db.exec("DELETE FROM team_members WHERE userId='viewer'");
    expect(await externalProjectList(request(), key, 1)).toEqual([]);
    await expect(externalProject(request(), key, "race")).rejects.toMatchObject(
      { code: "not_found" }
    );
  });
  it("blocks REST writes while Studio holds a lease, then uses revision-checked writes", async () => {
    const studio = await acquireProjectLease("owner", "club", "race");
    const command = {
      design: serializeDesign({ ...design, title: "Updated" }),
      base_revision: 1,
    };
    expect(
      (await updateExternalProject(request(command), context)).status
    ).toBe(409);
    await releaseProjectLease("owner", "race", studio.lease.sessionId);
    const response = await updateExternalProject(request(command), context);
    expect(await response.json()).toMatchObject({
      data: { id: "race", revision: 2 },
    });
    expect(
      (await updateExternalProject(request(command), context)).status
    ).toBe(409);
    expect(
      db.prepare("SELECT count(*) n FROM project_edit_leases").get()
    ).toMatchObject({ n: 0 });
  });
  it("holds the same lease across explicit REST sessions and blocks Studio and MCP", async () => {
    const acquired = await externalEditing(
      request({ action: "acquire" }),
      context
    );
    const { data } = await acquired.json();
    expect(data.session_id).toEqual(expect.any(String));
    await expect(
      acquireProjectLease("owner", "club", "race")
    ).rejects.toMatchObject({ code: "lease_unavailable" });
    const proposal = await previewProjectEdit(
      "editor",
      "race",
      1,
      { changes: [{ shape_id: "gate", patch: { x: 8 } }] },
      actor
    );
    await expect(
      applyProjectEdit("editor", "race", proposal.proposal_id, 1, actor)
    ).rejects.toMatchObject({ code: "lease_unavailable" });
    expect(
      (
        await externalEditing(
          request({ action: "release", session_id: data.session_id }),
          context
        )
      ).status
    ).toBe(200);
    expect(
      await applyProjectEdit("editor", "race", proposal.proposal_id, 1, actor)
    ).toMatchObject({ revision: 2 });
  });
  it.each(["viewer", "outsider"])(
    "rejects %s mutations even with write-capable credentials",
    async (user) => {
      mocks.auth.mockResolvedValue({ ok: true, identity: identity(user) });
      expect(
        (
          await updateExternalProject(
            request({ design: serializeDesign(design), base_revision: 1 }),
            context
          )
        ).status
      ).toBe(404);
      await expect(
        previewProjectEdit(
          user,
          "race",
          1,
          { changes: [{ shape_id: "gate", patch: { x: 8 } }] },
          { ...actor, userId: user }
        )
      ).rejects.toMatchObject({ code: "not_found" });
    }
  );
  it("rechecks role and revision when a reviewed MCP proposal is applied", async () => {
    const proposal = await previewProjectEdit(
      "editor",
      "race",
      1,
      { changes: [{ shape_id: "gate", patch: { x: 8 } }] },
      actor
    );
    db.exec("UPDATE team_members SET role='viewer' WHERE userId='editor'");
    await expect(
      applyProjectEdit("editor", "race", proposal.proposal_id, 1, actor)
    ).rejects.toMatchObject({ code: "not_found" });
    db.exec(
      "UPDATE team_members SET role='editor' WHERE userId='editor'; UPDATE projects SET title='Changed' WHERE id='race'"
    );
    await expect(
      applyProjectEdit("editor", "race", proposal.proposal_id, 1, actor)
    ).rejects.toMatchObject({ code: "revision_conflict" });
    expect(
      db
        .prepare("SELECT applied_at FROM mcp_project_edits WHERE id=?")
        .get(proposal.proposal_id)
    ).toMatchObject({ applied_at: null });
  });
  it("does not promote a personal proposal when its project moves to a team", async () => {
    db.exec(
      "UPDATE projects SET owner_team_id=NULL,owner_user_id='editor' WHERE id='race'"
    );
    const revision = Number(
      db.prepare("SELECT revision FROM projects WHERE id='race'").get()!
        .revision
    );
    const proposal = await previewProjectEdit("editor", "race", revision, {
      changes: [{ shape_id: "gate", patch: { x: 8 } }],
    });
    db.exec(
      "UPDATE projects SET owner_user_id=NULL,owner_team_id='club' WHERE id='race'"
    );
    await expect(
      applyProjectEdit("editor", "race", proposal.proposal_id, revision, actor)
    ).rejects.toMatchObject({ code: "not_found" });
  });
  it("creates only in the granted context, remains idempotent and denies selected-project creation", async () => {
    const command = {
      idempotency_key: "rest-create",
      proposal: {
        version: 2,
        title: "REST track",
        constraints: {
          field: { width: 30, height: 20 },
          inventory: {
            gate: 2,
            ladder: 0,
            divegate: 0,
            tower: 0,
            startfinish: 0,
            flag: 0,
            cone: 0,
            barrier: 0,
          },
        },
        shapes: [design.shapeById.gate],
      },
    };
    const first = await createExternalProject(request(command));
    expect(first.status).toBe(201);
    const { data } = await first.json();
    expect(
      db
        .prepare("SELECT owner_team_id,owner_user_id FROM projects WHERE id=?")
        .get(data.id)
    ).toMatchObject({ owner_team_id: "club", owner_user_id: null });
    expect(
      await (await createExternalProject(request(command))).json()
    ).toMatchObject({ data: { id: data.id, replayed: true } });
    mocks.auth.mockResolvedValue({
      ok: true,
      identity: identity("editor", {
        mode: "selected",
        teamId: "club",
        projectIds: ["race"],
      }),
    });
    expect(
      (
        await createExternalProject(
          request({ ...command, idempotency_key: "denied" })
        )
      ).status
    ).toBe(403);
  });
  it("checks membership atomically when a role changes during a REST save", async () => {
    let raced = false;
    mocks.db.mockResolvedValue(
      sqliteD1(db, (sql) => {
        if (!raced && sql.includes("UPDATE projects SET title=")) {
          raced = true;
          db.exec(
            "UPDATE team_members SET role='viewer' WHERE userId='editor'"
          );
        }
      })
    );
    expect(
      (
        await updateExternalProject(
          request({
            design: serializeDesign({ ...design, title: "Forbidden" }),
            base_revision: 1,
          }),
          context
        )
      ).status
    ).toBe(409);
    expect(
      db.prepare("SELECT title,revision FROM projects WHERE id='race'").get()
    ).toMatchObject({ title: "race", revision: 1 });
  });
  it("archives only with a valid session and revision", async () => {
    expect(
      (await archiveExternalProject(request({ base_revision: 2 }), context))
        .status
    ).toBe(409);
    db.prepare(
      "INSERT INTO shares(id,token,design_json,created_at,updated_at,published_at,owner_user_id,project_id) VALUES('share','token',?,'2026','2026','2026','owner','race')"
    ).run(JSON.stringify(serializeDesign(design)));
    db.exec(
      "INSERT INTO gallery_entries(id,share_token,owner_user_id,gallery_title,gallery_description,gallery_preview_image,created_at,updated_at) VALUES('gallery','token','owner','Race','','preview.png','2026','2026')"
    );
    const response = await archiveExternalProject(
      request({ base_revision: 1 }),
      context
    );
    expect(await response.json()).toMatchObject({ data: { archived: true } });
    expect(mocks.media).toHaveBeenCalledWith("preview.png");
    expect(
      db.prepare("SELECT count(*) n FROM gallery_entries").get()
    ).toMatchObject({ n: 0 });
    expect(
      db.prepare("SELECT revoked_at FROM shares WHERE token='token'").get()
        ?.revoked_at
    ).toEqual(expect.any(String));
    await expect(
      externalProject(request(), identity(), "race")
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
