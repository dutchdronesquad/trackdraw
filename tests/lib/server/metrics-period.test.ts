import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ prepare: vi.fn() }));
vi.mock("@/lib/server/db", () => ({
  getDatabase: async () => ({ prepare: mocks.prepare }),
}));
import { getProductInsights } from "@/lib/server/metrics";

let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(`
    create table users(id text, createdAt text);
    create table projects(owner_user_id text, created_at text);
    create table shares(token text, owner_user_id text, title text, created_at text);
    create table gallery_entries(owner_user_id text, gallery_state text);
    create table layout_presets(created_at text);
    create table product_events(created_at text, event_type text, contract_version text, metadata_json text, session_id text, user_id text);
    create table embed_referrer_daily(share_token text, referrer_hostname text, viewed_on text, view_count integer);
    create table product_metric_creator_activations(user_id text, activated_at text);
    create table apikey(lastRequest text);
    insert into shares values ('track', 'owner', 'Track', '2026-07-01T00:00:00.000Z');
    insert into projects values ('owner', '2026-05-01T00:00:00.000Z'), ('owner', '2026-07-01T00:00:00.000Z'), ('owner', '2026-09-27T00:00:00.000Z');
    insert into layout_presets values ('2026-05-01T00:00:00.000Z'), ('2026-07-01T00:00:00.000Z');
    insert into product_events values
      ('2025-10-01T00:00:00.000Z', 'export.completed', '1.1.0', '{"format":"png"}', 'expired', null),
      ('2026-05-01T00:00:00.000Z', 'export.completed', '1.1.0', '{"format":"svg"}', 'early', null),
      ('2026-07-01T00:00:00.000Z', 'editor.session_started', '1.1.0', '{}', 'session', null),
      ('2026-07-01T01:00:00.000Z', 'editor.meaningful_edit_completed', '1.1.0', '{}', 'session', null),
      ('2026-07-01T02:00:00.000Z', 'export.completed', '1.1.0', '{"format":"png"}', 'session', null),
      ('2026-07-01T02:00:00.000Z', 'share.viewed', '1.1.0', '{"surface":"embed"}', 'viewer', null),
      ('2026-09-27T00:00:00.000Z', 'export.completed', '1.1.0', '{"format":"png"}', 'today', null);
    insert into embed_referrer_daily values
      ('track', 'site.example', '2026-05-01', 100),
      ('track', 'site.example', '2026-07-01', 6),
      ('track', 'site.example', '2026-09-05', 3),
      ('track', 'hidden.example', '2026-09-05', 2),
      ('track', 'site.example', '2026-09-27', 100);
  `);
  mocks.prepare.mockImplementation((query: string) => {
    // Translate SQLite's numbered placeholders to positional bindings for node:sqlite.
    const indexes: number[] = [];
    const sql = query.replace(/\?(\d+)/g, (_, index) => {
      indexes.push(Number(index) - 1);
      return "?";
    });
    const statement = db.prepare(sql);
    let values: string[] = [];
    const args = () =>
      indexes.length ? indexes.map((index) => values[index]) : values;
    const adapter = {
      bind: (...bindings: string[]) => {
        values = bindings;
        return adapter;
      },
      all: async () => ({ results: statement.all(...args()) }),
      first: async () => statement.get(...args()),
    };
    return adapter;
  });
});
afterEach(() => db.close());
const now = new Date("2026-09-27T12:00:00Z");

describe("selected product insight periods", () => {
  it("filters content, editor sessions, exports and share views with exact UTC boundaries", async () => {
    const short = await getProductInsights(
      { from: "2026-07-01", to: "2026-09-27" },
      now
    );
    const long = await getProductInsights(
      { from: "2025-10-01", to: "2026-09-27" },
      now
    );
    expect(short.period).toMatchObject({
      from: "2026-07-01",
      to: "2026-09-26",
      days: 88,
    });
    expect(short.usage.exports).toBe(1);
    expect(long.usage.exports).toBe(2); // neither today nor expired raw events
    expect(short.usage.exportFormats).toEqual([{ format: "png", count: 1 }]);
    expect(short.usage.anonymousSessions).toBe(1);
    expect(short.usage.creatorFunnel.anonymous.valuable).toBe(1);
    expect(short.usage.shareSurfaces).toEqual([{ surface: "embed", count: 1 }]);
    expect(short.contentGrowth).toEqual([
      { period: "2026-07", projects: 1, shares: 1, presets: 1 },
    ]);
    expect(long.contentGrowth).toHaveLength(2);
    expect(short.usage.coverage?.complete).toBe(true);
    expect(long.usage.coverage).toMatchObject({
      complete: false,
      comparisonReady: false,
    });
  });
  it("preserves embed thresholds and suppresses comparisons beyond retained coverage", async () => {
    const long = await getProductInsights(
      { from: "2025-10-01", to: "2026-09-27" },
      now
    );
    expect(long.usage.embedReferrers).toHaveLength(1);
    expect(long.usage.embedReferrers[0]?.views).toBe(9);
    expect(long.usage.embedCoverage).toMatchObject({
      complete: false,
      comparisonReady: false,
    });
    const custom = await getProductInsights(
      { from: "2026-09-01", to: "2026-09-10" },
      now
    );
    expect(custom.usage.embedReferrers[0]?.views).toBe(3);
    expect(custom.usage.embedCoverage?.comparisonReady).toBe(true);
    expect(custom.period).toMatchObject({
      previousFrom: "2026-08-22",
      previousTo: "2026-08-31",
    });
  });
  it("does not treat the partially expired retention boundary day as fully covered", async () => {
    const boundary = await getProductInsights(
      { from: "2026-03-31", to: "2026-04-01" },
      now
    );
    expect(boundary.usage.coverage).toMatchObject({
      availableFrom: "2026-03-31",
      from: "2026-04-01",
      complete: false,
      comparisonReady: false,
    });
  });

  it("keeps ordered session cohorts, first-result timings and weekly totals distinct", async () => {
    const event = db.prepare(
      "insert into product_events values (?, ?, '1.1.0', ?, ?, null)"
    );
    const add = (session: string, at: string, name: string, metadata = "{}") =>
      event.run(`2026-07-${at}.000Z`, name, metadata, session);
    add("first", "06T10:00:00", "editor.session_started");
    add("first", "06T10:05:00", "editor.meaningful_edit_completed");
    add("first", "06T10:10:00", "export.completed", '{"format":"png"}');
    add("first", "06T10:20:00", "export.completed", '{"format":"png"}');
    add("before-edit", "06T11:00:00", "editor.session_started");
    add("before-edit", "06T11:02:00", "share.created");
    add("before-edit", "06T11:04:00", "editor.meaningful_edit_completed");
    add("invalid-order", "06T11:59:00", "editor.meaningful_edit_completed");
    add("invalid-order", "06T12:00:00", "editor.session_started");
    add("third", "06T13:00:00", "editor.session_started");
    add("third", "06T13:01:00", "editor.meaningful_edit_completed");
    add("third", "06T13:03:00", "export.completed", '{"format":"png"}');
    add("unfinished", "06T14:00:00", "editor.session_started");
    add("unfinished", "13T00:00:00", "share.created");
    add("outside", "05T23:59:00", "editor.session_started");
    add("outside", "06T00:05:00", "export.completed", '{"format":"png"}');
    const { analysis } = await getProductInsights(
      { from: "2026-07-06", to: "2026-07-12" },
      now
    );
    expect(analysis?.journey).toEqual({
      started: 5,
      edited: 3,
      valuable: 2,
      completed: 3,
    });
    expect(analysis?.timeToResult).toEqual({
      samples: 3,
      medianSeconds: 180,
      p75Seconds: 600,
    });
    expect(analysis?.weeks).toHaveLength(1);
    expect(analysis?.weeks[0]).toMatchObject({
      week: "2026-07-06",
      from: "2026-07-06",
      to: "2026-07-12",
      started: 5,
      edited: 3,
      valuable: 2,
      exports: 4,
    });
    expect(JSON.stringify(analysis)).not.toMatch(
      /session_id|user_id|first_result_at|before-edit|unfinished/
    );
    const wider = await getProductInsights(
      { from: "2026-07-06", to: "2026-07-19" },
      now
    );
    expect(wider.analysis?.timeToResult.samples).toBe(4);
    expect(wider.analysis?.weeks[1]?.started).toBe(0);
    expect(wider.analysis?.weeks[0]?.completed).toBe(4); // outcomes stay with their start week
  });

  it("pairs format outcomes from the same contract and separates unassignable legacy attempts", async () => {
    db.exec(`insert into product_events values
      ('2026-07-06T10:00:00.000Z', 'export.completed', '1.1.0', '{"format":"png"}', 'a', null),
      ('2026-07-06T10:01:00.000Z', 'export.failed', '1.1.0', '{"format":"png","category":"rendering"}', 'a', null),
      ('2026-07-06T10:02:00.000Z', 'operation.failed', '1.1.0', '{"operation":"export"}', 'a', null),
      ('2026-07-06T10:03:00.000Z', 'export.completed', '1.0.0', '{"format":"png"}', 'a', null),
      ('2026-07-06T10:04:00.000Z', 'operation.failed', '1.0.0', '{"operation":"export"}', 'a', null),
      ('2026-07-06T10:05:00.000Z', 'export.failed', null, '{"format":"png"}', 'a', null)
    `);
    const result = await getProductInsights(
      { from: "2026-07-06", to: "2026-07-12" },
      now
    );
    expect(result.analysis?.exportReliability).toEqual(
      expect.arrayContaining([
        {
          format: "png",
          legacy: false,
          successes: 1,
          failures: 1,
          failureRate: 0.5,
        },
        {
          format: "legacy",
          legacy: true,
          successes: 1,
          failures: 1,
          failureRate: null,
        },
      ])
    );
    expect(result.analysis?.exportReliability).toHaveLength(2);
  });

  it("averages the middle durations for even samples and leaves empty timing samples unknown", async () => {
    db.exec(`insert into product_events values
      ('2026-07-06T10:00:00.000Z', 'editor.session_started', '1.1.0', '{}', 'a', null),
      ('2026-07-06T10:02:00.000Z', 'share.created', '1.1.0', '{}', 'a', null),
      ('2026-07-06T11:00:00.000Z', 'editor.session_started', '1.1.0', '{}', 'b', null),
      ('2026-07-06T11:04:00.000Z', 'share.created', '1.1.0', '{}', 'b', null)
    `);
    const result = await getProductInsights(
      { from: "2026-07-06", to: "2026-07-12" },
      now
    );
    expect(result.analysis?.timeToResult).toEqual({
      samples: 2,
      medianSeconds: 180,
      p75Seconds: 240,
    });
    const empty = await getProductInsights(
      { from: "2026-07-13", to: "2026-07-19" },
      now
    );
    expect(empty.analysis?.timeToResult).toEqual({
      samples: 0,
      medianSeconds: null,
      p75Seconds: null,
    });
    expect(empty.analysis?.weeks[0]?.exports).toBe(0);
  });

  it("rejects invalid dates and reports an empty future selection without coverage", async () => {
    await expect(
      getProductInsights({ from: "2026-02-30", to: "2026-03-01" }, now)
    ).rejects.toThrow();
    await expect(
      getProductInsights({ from: "2026-03-02", to: "2026-03-01" }, now)
    ).rejects.toThrow();
    const future = await getProductInsights(
      { from: "2027-01-01", to: "2027-02-01" },
      now
    );
    expect(future.period?.days).toBe(0);
    expect(future.usage.coverage?.complete).toBe(false);
    expect(future.usage.exports).toBe(0);
  });
});
