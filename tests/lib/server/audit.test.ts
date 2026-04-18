import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const prepareMock = vi.fn();
const bindMock = vi.fn();
const allMock = vi.fn();

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({
    prepare: prepareMock,
  })),
}));

import { listAuditEvents } from "@/lib/server/audit";

describe("listAuditEvents", () => {
  beforeEach(() => {
    prepareMock.mockReset();
    bindMock.mockReset();
    allMock.mockReset();

    prepareMock.mockReturnValue({
      bind: bindMock,
    });

    bindMock.mockReturnValue({
      all: allMock,
    });
  });

  it("applies filters and maps actor and target context", async () => {
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

    expect(prepareMock).toHaveBeenCalledTimes(1);
    expect(bindMock).toHaveBeenCalledWith(
      "account.role.changed",
      "admin-1",
      "user-2",
      20
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

    expect(bindMock).toHaveBeenCalledWith(200);
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
        actor: null,
        target: null,
      },
    ]);
  });
});
