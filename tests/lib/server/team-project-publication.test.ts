import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import { createCatalogShapeDraft } from "@/lib/track/elements/catalog";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  removeMedia: vi.fn(),
  user: vi.fn(),
  trusted: vi.fn(() => true),
}));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.db }));
vi.mock("@/lib/server/gallery-media", () => ({
  deleteGalleryPreviewImage: mocks.removeMedia,
}));
vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: mocks.user,
}));
vi.mock("@/lib/server/csrf", () => ({ isTrustedRequest: mocks.trusted }));
vi.mock("@/lib/server/audit", () => ({ recordAuditEvent: vi.fn() }));
import {
  changeTeamPublication,
  readTeamPublication,
} from "@/lib/server/team-project-publication";
import { canManageShare } from "@/lib/server/share-management";
import {
  createShare,
  resolveStoredShare,
  revokeShare,
} from "@/lib/server/shares";
import {
  deleteGalleryEntry,
  listPublicGalleryEntries,
  moveGalleryEntryToListed,
} from "@/lib/server/gallery";
import {
  previewProjectMove,
  movePersonalProject,
} from "@/lib/server/team-projects";
import { getProjectForUser } from "@/lib/server/projects";
import { GET, POST } from "@/app/api/team-projects/publication/route";
let db: DatabaseSync;
const context = { teamId: "club", projectId: "race" };
const command = { ...context, action: "publish" as const, revision: 1 };
let design: ReturnType<typeof createDefaultDesign>;
beforeEach(() => {
  command.revision = 1;
  db = createMigratedDatabase();
  mocks.db.mockResolvedValue(sqliteD1(db));
  mocks.user.mockResolvedValue({ id: "owner" });
  mocks.trusted.mockReturnValue(true);
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
    title: "Public race",
    authorName: "Private author",
    inventory: { ...createDefaultDesign().inventory, gate: 23 },
    mapReference: {
      type: "map",
      provider: "esri-world-imagery",
      mapStyle: "satellite",
      centerLat: 52.1234,
      centerLng: 5.9876,
      zoom: 18,
      rotationDeg: 0,
      opacity: 1,
      visible: true,
      locked: false,
    },
    shapeOrder: ["gate"],
    shapeById: {
      gate: {
        id: "gate",
        kind: "gate",
        x: 3,
        y: 4,
        rotation: 0,
        width: 2,
        height: 2,
        meta: { secret: "Internal note", timing: { role: "split" } },
        appearance: {
          source: "private",
          templateId: "gate-standard-v1",
          assetId: "private-asset",
        },
      },
    },
  };
  db.prepare(
    "INSERT INTO projects(id,owner_team_id,created_by_user_id,title,design_json,created_at,updated_at) VALUES('race','club','editor',?,?,?,?)"
  ).run(design.title, JSON.stringify(serializeDesign(design)), now, now);
});
afterEach(() => {
  db.close();
  vi.clearAllMocks();
});
const publish = () => changeTeamPublication("owner", command);
const mutate = (token: string, action: "revoke" | "unlist") =>
  changeTeamPublication("owner", { ...context, action, token });
async function snapshot() {
  const share = await publish();
  if (!share) throw Error("missing");
  return share.token;
}
describe("private team publication", () => {
  it.each(["editor", "viewer", "outsider"])(
    "%s cannot publish or read management metadata",
    async (user) => {
      await expect(changeTeamPublication(user, command)).rejects.toMatchObject({
        code: "not_found",
      });
      await expect(
        readTeamPublication(user, "club", "race")
      ).rejects.toMatchObject({ code: "not_found" });
      expect(await getProjectForUser("race", user)).toBeNull();
    }
  );
  it("publishes a sanitized independent snapshot, preserving catalog geometry and public timing", async () => {
    const catalog = createCatalogShapeDraft("multigp-standard-gate-5x5", {
      x: 3,
      y: 4,
      includeCatalogMetadata: true,
    });
    design.shapeById.gate = {
      ...catalog,
      id: "gate",
      meta: {
        ...catalog.meta,
        secret: "Internal note",
        timing: { role: "split" },
      },
      appearance: design.shapeById.gate.appearance,
    };
    db.prepare("UPDATE projects SET design_json=? WHERE id='race'").run(
      JSON.stringify(serializeDesign(design))
    );
    command.revision = 2;
    const token = await snapshot();
    const resolved = await resolveStoredShare(token);
    expect(resolved.status).toBe("available");
    if (resolved.status !== "available") throw Error("missing");
    expect(resolved.share.design).toMatchObject({
      id: token,
      title: "Public race",
      mapReference: null,
      inventory: { gate: 0 },
      shapeById: { gate: { x: 3, meta: { timing: { role: "split" } } } },
    });
    const payload = JSON.stringify(serializeDesign(resolved.share.design));
    for (const secret of [
      "Internal note",
      "Private author",
      "private-asset",
      "52.1234",
      "owner_team_id",
      "created_by_user_id",
    ])
      expect(payload).not.toContain(secret);
    expect(resolved.share.design.shapeById.gate.appearance).toBeUndefined();
    expect(resolved.share.design.shapeById.gate.meta?.catalog).toMatchObject({
      elementId: "multigp-standard-gate-5x5",
    });
    expect(await listPublicGalleryEntries()).toHaveLength(0);
  });
  it("keeps edits private until explicit revision-checked republish on the same canonical token", async () => {
    const token = await snapshot();
    design.title = "Private new version";
    db.prepare("UPDATE projects SET design_json=?,title=? WHERE id='race'").run(
      JSON.stringify(serializeDesign(design)),
      design.title
    );
    const old = await resolveStoredShare(token);
    expect(old.status === "available" && old.share.design.title).toBe(
      "Public race"
    );
    await expect(publish()).rejects.toMatchObject({ code: "conflict" });
    const updated = await changeTeamPublication("owner", {
      ...command,
      revision: 2,
    });
    expect(updated?.token).toBe(token);
    const current = await resolveStoredShare(token);
    expect(current.status === "available" && current.share.design.title).toBe(
      "Private new version"
    );
  });
  it("rejects ownership/revision races at the write itself", async () => {
    let raced = false;
    mocks.db.mockResolvedValue(
      sqliteD1(db, (sql) => {
        if (!raced && sql.includes("INSERT INTO shares")) {
          raced = true;
          db.exec("UPDATE projects SET title='Concurrent' WHERE id='race'");
        }
      })
    );
    await expect(publish()).rejects.toMatchObject({ code: "conflict" });
    expect(db.prepare("SELECT count(*) n FROM shares").get()).toMatchObject({
      n: 0,
    });
  });
  it("lists only an existing public snapshot and respects moderation, unlisting and revocation", async () => {
    const token = await snapshot();
    const list = {
      ...context,
      action: "list" as const,
      token,
      title: "Public gallery title",
      description: "Public gallery description",
    };
    await changeTeamPublication("owner", list);
    expect(await listPublicGalleryEntries()).toHaveLength(1);
    await mutate(token, "unlist");
    expect(await listPublicGalleryEntries()).toHaveLength(0);
    expect((await resolveStoredShare(token)).status).toBe("available");
    await changeTeamPublication("owner", list);
    db.exec("UPDATE gallery_entries SET gallery_state='hidden'");
    await expect(changeTeamPublication("owner", list)).rejects.toMatchObject({
      code: "not_found",
    });
    await mutate(token, "revoke");
    expect((await resolveStoredShare(token)).status).toBe("revoked");
    expect(await listPublicGalleryEntries()).toHaveLength(0);
  });
  it.each(["editor", "viewer", "outsider"])(
    "%s cannot mutate any share or gallery through legacy token routes",
    async (user) => {
      const token = await snapshot();
      await changeTeamPublication("owner", {
        ...context,
        action: "list",
        token,
        title: "Gallery race",
        description: "A public gallery race",
      });
      expect(await canManageShare(user, token)).toBe(false);
      await revokeShare(token, user);
      await deleteGalleryEntry(token, user);
      await moveGalleryEntryToListed(token, user);
      expect((await resolveStoredShare(token)).status).toBe("available");
      expect(await listPublicGalleryEntries()).toHaveLength(1);
      await expect(
        changeTeamPublication(user, { ...context, action: "revoke", token })
      ).rejects.toMatchObject({ code: "not_found" });
    }
  );
  it("membership removal and deleting a former editor do not revoke deliberate public links", async () => {
    const token = await snapshot();
    db.exec(
      "DELETE FROM team_members WHERE userId='editor'; DELETE FROM users WHERE id='editor'"
    );
    expect((await resolveStoredShare(token)).status).toBe("available");
    expect(() => db.exec("DELETE FROM users WHERE id='owner'")).toThrow(
      /team_owner_required/
    );
  });
  it("retains existing personal links during a move, and blocks stale personal publication afterwards", async () => {
    db.exec("DELETE FROM projects WHERE id='race'");
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO projects(id,owner_user_id,title,design_json,created_at,updated_at) VALUES('race','owner',?,?,?,?)"
    ).run(design.title, JSON.stringify(serializeDesign(design)), now, now);
    const share = await createShare(design, {
      ownerUserId: "owner",
      projectId: "race",
    });
    const preview = await previewProjectMove("owner", "race");
    await movePersonalProject(
      "owner",
      "club",
      "race",
      preview.revision,
      preview.publicationVersion
    );
    const retained = await resolveStoredShare(share.token);
    expect(retained.status).toBe("available");
    if (retained.status !== "available") throw Error("missing");
    expect(retained.share.design.inventory.gate).toBe(0);
    expect(retained.share.design.shapeById.gate.appearance).toBeUndefined();
    expect(
      JSON.stringify(serializeDesign(retained.share.design))
    ).not.toContain("Internal note");
    expect(
      (await readTeamPublication("owner", "club", "race")).shares.map(
        (s) => s.token
      )
    ).toContain(share.token);
    await expect(
      createShare(design, { ownerUserId: "owner", projectId: "race" })
    ).rejects.toMatchObject({ code: "conflict" });
    await mutate(share.token, "revoke");
    expect((await resolveStoredShare(share.token)).status).toBe("revoked");
  });
  it("team API requires a browser session, trusted origin and bounded valid commands, with no-store responses", async () => {
    const request = (body: unknown) =>
      new Request("http://localhost/api/team-projects/publication", {
        method: "POST",
        body: JSON.stringify(body),
      });
    mocks.user.mockResolvedValue(null);
    expect((await POST(request(command))).status).toBe(401);
    mocks.user.mockResolvedValue({ id: "owner" });
    mocks.trusted.mockReturnValue(false);
    expect((await POST(request(command))).status).toBe(403);
    mocks.trusted.mockReturnValue(true);
    expect((await POST(request({ ...command, design }))).status).toBe(400);
    expect(
      (await POST(request({ ...command, extra: "x".repeat(5000) }))).status
    ).toBe(413);
    const response = await POST(request(command));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.share.path).toMatch(/^\/share\//);
    mocks.user.mockResolvedValue({ id: "outsider" });
    expect(
      (
        await GET(
          new Request(
            "http://localhost/api/team-projects/publication?teamId=club&projectId=race"
          )
        )
      ).status
    ).toBe(404);
  });
});
