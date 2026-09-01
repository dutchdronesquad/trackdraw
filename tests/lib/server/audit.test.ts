import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const prepareMock = vi.fn();
const bindMock = vi.fn();
const allMock = vi.fn();
const firstMock = vi.fn();

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({
    prepare: prepareMock,
  })),
}));

import {
  createAuditEvent,
  listAuditEventFacets,
  listAuditEvents,
  queryAuditEvents,
  sanitizeAuditMetadata,
} from "@/lib/server/audit";

describe("listAuditEvents", () => {
  beforeEach(() => {
    prepareMock.mockReset();
    bindMock.mockReset();
    allMock.mockReset();
    firstMock.mockReset();

    prepareMock.mockReturnValue({
      bind: bindMock,
    });

    bindMock.mockReturnValue({
      all: allMock,
      first: firstMock,
    });
  });

  it("applies filters and maps actor and target context", async () => {
    firstMock.mockResolvedValue({
      count: 1,
      actor_count: 1,
      target_count: 1,
    });
    allMock.mockResolvedValue({
      results: [
        {
          id: "evt-1",
          actor_user_id: "admin-1",
          target_user_id: "user-2",
          event_type: "account.role.changed",
          entity_type: "user",
          entity_id: "user-2",
          metadata_json: '{"previousRole":"user","nextRole":"moderator"}',
          created_at: "2026-04-18T10:00:00.000Z",
          actor_kind: "user",
          actor_label: null,
          actor_id: "admin-1",
          actor_name: "Admin",
          actor_email: "admin@trackdraw.local",
          target_id: "user-2",
          target_name: "Target User",
          target_email: "target@trackdraw.local",
        },
      ],
    });

    const events = await listAuditEvents({
      limit: 20,
      eventTypes: ["account.role.changed"],
      actorUserId: "admin-1",
      targetUserId: "user-2",
    });

    expect(prepareMock).toHaveBeenCalledTimes(2);
    expect(bindMock).toHaveBeenNthCalledWith(
      1,
      "account.role.changed",
      "admin-1",
      "user-2"
    );
    expect(bindMock).toHaveBeenNthCalledWith(
      2,
      "account.role.changed",
      "admin-1",
      "user-2",
      20,
      0
    );
    expect(events).toEqual([
      {
        id: "evt-1",
        actorUserId: "admin-1",
        targetUserId: "user-2",
        eventType: "account.role.changed",
        entityType: "user",
        entityId: "user-2",
        metadata: {
          previousRole: "user",
          nextRole: "moderator",
        },
        createdAt: "2026-04-18T10:00:00.000Z",
        actorKind: "user",
        actorLabel: null,
        targetLabel: null,
        actor: {
          id: "admin-1",
          name: "Admin",
          email: "admin@trackdraw.local",
        },
        target: {
          id: "user-2",
          name: "Target User",
          email: "target@trackdraw.local",
        },
      },
    ]);
  });

  it("clamps the limit and safely nulls invalid metadata", async () => {
    firstMock.mockResolvedValue({
      count: 1,
      actor_count: 0,
      target_count: 0,
    });
    allMock.mockResolvedValue({
      results: [
        {
          id: "evt-2",
          actor_user_id: null,
          target_user_id: null,
          event_type: "account.role.changed",
          entity_type: "user",
          entity_id: null,
          metadata_json: '"not-an-object"',
          created_at: "2026-04-18T11:00:00.000Z",
          actor_kind: "system",
          actor_label: "Maintenance job",
          actor_id: null,
          actor_name: null,
          actor_email: null,
          target_id: null,
          target_name: null,
          target_email: null,
        },
      ],
    });

    const events = await listAuditEvents({ limit: 999 });

    expect(bindMock).toHaveBeenNthCalledWith(1);
    expect(bindMock).toHaveBeenNthCalledWith(2, 200, 0);
    expect(events).toEqual([
      {
        id: "evt-2",
        actorUserId: null,
        targetUserId: null,
        eventType: "account.role.changed",
        entityType: "user",
        entityId: null,
        metadata: null,
        createdAt: "2026-04-18T11:00:00.000Z",
        actorKind: "system",
        actorLabel: "Maintenance job",
        targetLabel: null,
        actor: null,
        target: null,
      },
    ]);
  });

  it("applies server-side category, period, search, and pagination filters", async () => {
    firstMock.mockResolvedValue({
      count: 51,
      actor_count: 4,
      target_count: 3,
    });
    allMock.mockResolvedValue({ results: [] });

    const result = await queryAuditEvents({
      page: 2,
      pageSize: 25,
      category: "Credentials",
      actorUserId: "user-1",
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-31T23:59:59.999Z",
      search: "macbook",
    });

    const sql = prepareMock.mock.calls.map(([value]) => value).join("\n");
    expect(sql).toContain("ae.event_type like 'api_key.%'");
    expect(sql).toContain("ae.event_type like 'credential.%'");
    expect(sql).toContain("ae.created_at >= ?");
    expect(sql).toContain("lower(coalesce(ae.metadata_json, '')) like ?");
    expect(bindMock.mock.calls[1]?.slice(-2)).toEqual([25, 25]);
    expect(result).toMatchObject({
      page: 2,
      pageCount: 3,
      total: 51,
      actorCount: 4,
      targetCount: 3,
    });
  });

  it("filters non-user identities and treats LIKE wildcards literally", async () => {
    firstMock.mockResolvedValue({
      count: 0,
      actor_count: 0,
      target_count: 0,
    });
    allMock.mockResolvedValue({ results: [] });

    await queryAuditEvents({
      actor: "kind:system",
      target: "target-label:Deleted user",
      search: "100%_done",
    });

    const sql = prepareMock.mock.calls.map(([value]) => value).join("\n");
    expect(sql).toContain("ae.actor_user_id is null and ae.actor_kind = ?");
    expect(sql).toContain("ae.target_user_id is null and ae.target_label = ?");
    expect(sql).toContain("like ? escape '\\'");
    expect(bindMock.mock.calls[0]).toContain("system");
    expect(bindMock.mock.calls[0]).toContain("Deleted user");
    expect(bindMock.mock.calls[0]).toContain("%100\\%\\_done%");
  });

  it("builds contextual facets for people, system actors, and deleted accounts", async () => {
    allMock
      .mockResolvedValueOnce({
        results: [
          { event_type: "account.role.changed" },
          { event_type: "gallery.entry.hidden" },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          {
            user_id: "admin-1",
            user_name: "Admin",
            user_email: "admin@trackdraw.local",
            kind: "user",
            label: null,
          },
          {
            user_id: null,
            user_name: null,
            user_email: null,
            kind: "system",
            label: "Maintenance job",
          },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          {
            user_id: null,
            user_name: null,
            user_email: null,
            kind: null,
            label: "Deleted user",
          },
        ],
      });

    const facets = await listAuditEventFacets({
      category: "Account",
      from: "2026-08-01T00:00:00.000Z",
    });

    expect(facets).toEqual({
      eventTypes: ["account.role.changed", "gallery.entry.hidden"],
      actors: [
        {
          value: "user:admin-1",
          kind: "user",
          label: "Admin",
          email: "admin@trackdraw.local",
        },
        {
          value: "actor-label:system:Maintenance job",
          kind: "system",
          label: "Maintenance job",
          email: null,
        },
      ],
      targets: [
        {
          value: "target-label:Deleted user",
          kind: "unavailable",
          label: "Deleted user",
          email: null,
        },
      ],
    });
    expect(bindMock).toHaveBeenCalledTimes(3);
    expect(bindMock.mock.calls[0]).toEqual(["2026-08-01T00:00:00.000Z"]);
    expect(bindMock.mock.calls[1]).toEqual(["2026-08-01T00:00:00.000Z"]);
    expect(bindMock.mock.calls[2]).toEqual(["2026-08-01T00:00:00.000Z"]);
  });

  it("does not fail a completed mutation when audit storage is unavailable", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const run = vi.fn().mockRejectedValue(new Error("D1 unavailable"));
    bindMock.mockReturnValue({ run });

    const recorded = await createAuditEvent({
      actorUserId: "user-1",
      eventType: "project.archived",
      entityType: "project",
      entityId: "project-1",
    });

    expect(recorded).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(
      "[TrackDraw audit] Failed to record audit event",
      expect.objectContaining({
        eventType: "project.archived",
        entityId: "project-1",
      })
    );
  });

  it("redacts credentials and bounds nested metadata", () => {
    expect(
      sanitizeAuditMetadata({
        name: "MacBook",
        shareToken: "share-secret",
        nested: { authorization: "Bearer secret", safe: true },
        publicKey: "credential-material",
      })
    ).toEqual({
      name: "MacBook",
      shareToken: "[redacted]",
      nested: { authorization: "[redacted]", safe: true },
      publicKey: "[redacted]",
    });
  });
});
