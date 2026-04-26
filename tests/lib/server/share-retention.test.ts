import { describe, expect, it, vi } from "vitest";
import { cleanupExpiredShares } from "@/lib/server/share-retention";

describe("share retention", () => {
  it("only expires temporary shares while keeping active published shares", async () => {
    const run = vi.fn(async () => ({}));
    const prepare = vi.fn((query: string) => ({ query, run }));

    await cleanupExpiredShares({ prepare } as Parameters<
      typeof cleanupExpiredShares
    >[0]);

    const sql = prepare.mock.calls[0][0];
    expect(sql).toContain("share_type = 'temporary'");
    expect(sql).toContain("datetime(revoked_at) < datetime('now', '-30 days')");
    expect(run).toHaveBeenCalled();
  });
});
