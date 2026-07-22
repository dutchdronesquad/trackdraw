import { beforeEach, describe, expect, it, vi } from "vitest";
import { createD1Statement } from "../../helpers/d1";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({ prepare: mocks.prepare })),
}));

import { recordProductEvent } from "@/lib/server/product-events";

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
      event: "export.completed",
      sessionId: "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
      userId: "user-1",
      projectId: "project-1",
      metadata: { format: "pdf" },
    });

    expect(statement.sql).toContain("insert into product_events");
    expect(statement.bind).toHaveBeenCalledOnce();
    expect(statement.bind.mock.calls[0]).toEqual([
      expect.any(String),
      "export.completed",
      "0dbb9964-cbc6-4205-a92e-f75ad9cba299",
      "user-1",
      "project-1",
      null,
      '{"format":"pdf"}',
      expect.any(String),
    ]);
  });
});
