import { beforeEach, describe, expect, it, vi } from "vitest";
import { createD1AllStatement, createD1Statement } from "../../helpers/d1";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ prepare: vi.fn() }));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({ prepare: mocks.prepare })),
}));

import {
  getEmbedReferrersByOwner,
  recordEmbedReferrer,
} from "@/lib/server/embed-referrers";
import { cleanupExpiredEmbedReferrers } from "@/lib/server/embed-referrer-retention";

beforeEach(() => {
  mocks.prepare.mockReset();
});

describe("embed referrer aggregation", () => {
  it("increments a daily aggregate only for an active published share", async () => {
    const statement = createD1Statement({ run: {} });
    mocks.prepare.mockImplementation((sql: string) => {
      statement.sql = sql;
      return statement;
    });

    await recordEmbedReferrer("share-token", "events.example.org");

    expect(statement.sql).toContain("insert into embed_referrer_daily");
    expect(statement.sql).toContain("share_type = 'published'");
    expect(statement.sql).toContain("view_count = view_count + 1");
    expect(statement.bind.mock.calls[0]).toEqual([
      "share-token",
      "events.example.org",
      expect.any(String),
      expect.any(String),
      "share-token",
      expect.any(String),
    ]);
  });

  it("returns only thresholded aggregate hosts for shares owned by the user", async () => {
    const statement = createD1AllStatement([
      {
        share_token: "share-token",
        referrer_hostname: "events.example.org",
        views: 7,
      },
    ]);
    mocks.prepare.mockImplementation((sql: string) => {
      statement.sql = sql;
      return statement;
    });

    const result = await getEmbedReferrersByOwner("owner-1");

    expect(statement.sql).toContain("having sum(r.view_count) >= ?");
    expect(statement.sql).not.toContain("session_id");
    expect(statement.sql).not.toContain("user_agent");
    expect(statement.bind).toHaveBeenCalledWith("owner-1", "-29 days", 3);
    expect(result.get("share-token")).toEqual([
      { hostname: "events.example.org", views: 7 },
    ]);
  });

  it("removes daily aggregates after 90 days", async () => {
    const statement = createD1Statement({ run: {} });
    const db = {
      prepare: vi.fn((sql: string) => {
        statement.sql = sql;
        return statement;
      }),
    };

    await cleanupExpiredEmbedReferrers(
      db as Parameters<typeof cleanupExpiredEmbedReferrers>[0]
    );

    expect(statement.sql).toContain("embed_referrer_daily");
    expect(statement.sql).toContain("-90 days");
    expect(statement.run).toHaveBeenCalledOnce();
  });
});
