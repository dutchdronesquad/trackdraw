import { beforeEach, describe, expect, it, vi } from "vitest";
import { createD1Statement } from "../../helpers/d1";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({ prepare: mocks.prepare })),
}));

import {
  deleteProductEventsForSession,
  deleteProductEventsForUser,
  recordProductEvent,
  setProductAnalyticsPreference,
} from "@/lib/server/product-events";

beforeEach(() => {
  mocks.prepare.mockReset();
});

describe("product events", () => {
  it("stores only the supplied privacy-safe event context", async () => {
    const statement = createD1Statement({ run: {} });
    mocks.prepare.mockImplementation((sql: string) => {
      statement.sql = sql;
      return statement;
    });

    await recordProductEvent({
      contractVersion: "1.0.0",
      event: "export.completed",
      sessionId: "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
      userId: "user-1",
      projectId: "project-1",
      properties: { format: "pdf" },
    });

    expect(statement.sql).toContain("insert or ignore into product_events");
    expect(statement.bind).toHaveBeenCalledOnce();
    expect(statement.bind.mock.calls[0]).toEqual([
      expect.any(String),
      "1.0.0",
      "export.completed",
      "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
      "user-1",
      "project-1",
      null,
      '{"format":"pdf"}',
      expect.any(String),
      expect.any(String),
    ]);
  });

  it("deletes every account-linkable event before account ownership disappears", async () => {
    const statement = createD1Statement({ run: {} });
    mocks.prepare.mockImplementation((sql: string) => {
      statement.sql = sql;
      return statement;
    });

    await deleteProductEventsForUser("user-1");

    expect(statement.sql).toContain("project_id in");
    expect(statement.sql).toContain("share_token in");
    expect(statement.bind).toHaveBeenCalledWith("user-1", "user-1", "user-1");
  });

  it("removes an anonymous session and persists a signed-in objection", async () => {
    const sessionStatement = createD1Statement({ run: {} });
    const preferenceStatement = createD1Statement({ run: {} });
    mocks.prepare
      .mockReturnValueOnce(sessionStatement)
      .mockReturnValueOnce(preferenceStatement);

    await deleteProductEventsForSession("session-1");
    await setProductAnalyticsPreference("user-1", false);

    expect(sessionStatement.bind).toHaveBeenCalledWith("session-1");
    expect(preferenceStatement.bind).toHaveBeenCalledWith(
      0,
      expect.any(String),
      "user-1"
    );
  });
});
