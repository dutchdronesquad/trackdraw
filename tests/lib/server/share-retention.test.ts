import { DatabaseSync } from "node:sqlite";
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
    expect(sql).toContain(
      "revoked_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')"
    );
    expect(sql).toContain(
      "expires_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')"
    );
    expect(run).toHaveBeenCalled();
  });

  it("deletes only shares beyond the 7-day retention window in SQLite", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`
      create table shares(token text, share_type text, revoked_at text, expires_at text);
      insert into shares values
        ('revoked-temporary', 'temporary', '2026-09-25T00:17:00.000Z', null),
        ('revoked-published', 'published', '2026-09-26T00:16:59.999Z', null),
        ('expired-temporary', 'temporary', null, '2026-09-26T00:16:59.999Z'),
        ('recently-revoked', 'published', '2026-09-26T00:17:00.001Z', null),
        ('recently-expired', 'temporary', null, '2026-09-26T00:17:00.001Z'),
        ('revoked-at-boundary', 'published', '2026-09-26T00:17:00.000Z', null),
        ('expired-at-boundary', 'temporary', null, '2026-09-26T00:17:00.000Z'),
        ('active-published', 'published', null, null),
        ('published-with-old-expiry', 'published', null, '2026-09-01T00:00:00.000Z'),
        ('active-temporary', 'temporary', null, '2026-10-04T00:00:00.000Z'),
        ('temporary-without-expiry', 'temporary', null, null);
    `);
    const adapter: Parameters<typeof cleanupExpiredShares>[0] = {
      prepare(query) {
        // Freeze SQLite's clock while executing the real cleanup query.
        const statement = db.prepare(
          query.replaceAll("'now'", "'2026-10-03T00:17:00.000Z'")
        );
        return { run: async <T>() => statement.run() as T };
      },
    };

    try {
      await cleanupExpiredShares(adapter);

      const remaining = () =>
        db.prepare("select token from shares order by token").all();
      const expected = [
        "active-published",
        "active-temporary",
        "expired-at-boundary",
        "published-with-old-expiry",
        "recently-expired",
        "recently-revoked",
        "revoked-at-boundary",
        "temporary-without-expiry",
      ].map((token) => ({ token }));
      expect(remaining()).toEqual(expected);

      await cleanupExpiredShares(adapter);
      expect(remaining()).toEqual(expected);
    } finally {
      db.close();
    }
  });
});
