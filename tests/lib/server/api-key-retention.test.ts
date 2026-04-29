import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { cleanupExpiredApiKeys } from "@/lib/server/api-key-retention";

describe("API key retention", () => {
  it("deletes expired Better Auth API key records after the retention window", async () => {
    const run = vi.fn(async () => ({}));
    const statement = {
      bind: vi.fn(() => statement),
      run,
    };
    const prepare = vi.fn((query: string) => {
      void query;
      return statement;
    });

    await cleanupExpiredApiKeys(
      { prepare } as Parameters<typeof cleanupExpiredApiKeys>[0],
      90
    );

    const sql = prepare.mock.calls[0][0];
    expect(sql).toContain("delete from apikey");
    expect(sql).toContain("expiresAt is not null");
    expect(sql).toContain("datetime(expiresAt) < datetime('now', ?)");
    expect(statement.bind).toHaveBeenCalledWith("-90 days");
    expect(run).toHaveBeenCalled();
  });
});
