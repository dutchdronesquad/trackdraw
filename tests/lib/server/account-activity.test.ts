import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isAccountInactive,
  recordAuthenticatedAccountActivity,
} from "@/lib/server/account-activity";

const now = new Date("2026-10-03T12:00:00.000Z");
const inactiveBefore = new Date("2025-10-03T12:00:00.000Z");
let sqlite: DatabaseSync;

function adapter() {
  return {
    prepare(query: string) {
      const statement = sqlite.prepare(query);
      let bindings: SQLInputValue[] = [];
      const result = {
        bind(...values: string[]) {
          bindings = values;
          return result;
        },
        first: async <T>() => (statement.get(...bindings) as T) ?? null,
        run: async <T>() => statement.run(...bindings) as T,
      };
      return result;
    },
  };
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    create table users(id text primary key, createdAt text, updatedAt text, last_active_at text);
    create table sessions(userId text, createdAt text, updatedAt text, expiresAt text);
    insert into users values ('pilot', '2024-01-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
  `);
});
afterEach(() => sqlite.close());

function lastActiveAt() {
  return sqlite
    .prepare("select last_active_at from users where id = 'pilot'")
    .get()?.last_active_at;
}

describe("authenticated account activity", () => {
  it("updates stale activity without redefining account creation or profile edits", async () => {
    await recordAuthenticatedAccountActivity(
      adapter(),
      { id: "pilot", lastActiveAt: lastActiveAt() },
      now
    );
    expect(lastActiveAt()).toBe(now.toISOString());
    expect(
      sqlite.prepare("select createdAt, updatedAt from users").get()
    ).toEqual({
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    });
  });

  it.each(["2026-10-02T12:00:00.001Z", new Date("2026-10-03T11:00:00Z")])(
    "does not issue a write for activity less than 24 hours old: %s",
    async (recentActivity) => {
      const db = { prepare: vi.fn() };
      await recordAuthenticatedAccountActivity(
        db,
        { id: "pilot", lastActiveAt: recentActivity },
        now
      );
      expect(db.prepare).not.toHaveBeenCalled();
    }
  );

  it("refreshes at 24 hours and suppresses writes from concurrent stale snapshots", async () => {
    const previous = "2026-10-02T12:00:00.000Z";
    sqlite.prepare("update users set last_active_at = ?").run(previous);
    const db = adapter();
    const snapshot = { id: "pilot", lastActiveAt: previous };
    const before = sqlite
      .prepare("select total_changes() as count")
      .get()?.count;
    await Promise.all([
      recordAuthenticatedAccountActivity(db, snapshot, now),
      recordAuthenticatedAccountActivity(db, snapshot, now),
    ]);
    expect(lastActiveAt()).toBe(now.toISOString());
    expect(sqlite.prepare("select total_changes() as count").get()?.count).toBe(
      Number(before) + 1
    );

    await recordAuthenticatedAccountActivity(
      db,
      { id: "pilot", lastActiveAt: lastActiveAt() },
      new Date("2026-10-04T11:59:59.999Z")
    );
    expect(lastActiveAt()).toBe(now.toISOString());
    await recordAuthenticatedAccountActivity(
      db,
      { id: "pilot", lastActiveAt: lastActiveAt() },
      new Date("2026-10-04T12:00:00.000Z")
    );
    expect(lastActiveAt()).toBe("2026-10-04T12:00:00.000Z");
  });

  it.each([null, "invalid-date"])(
    "initializes missing or invalid activity: %s",
    async (value) => {
      sqlite.prepare("update users set last_active_at = ?").run(value);
      await recordAuthenticatedAccountActivity(
        adapter(),
        { id: "pilot", lastActiveAt: value },
        now
      );
      expect(lastActiveAt()).toBe(now.toISOString());
    }
  );

  it("preserves authentication when bookkeeping fails without logging account details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const db = {
      prepare() {
        throw new Error("sensitive database details");
      },
    };
    await expect(
      recordAuthenticatedAccountActivity(db, { id: "pilot" }, now)
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      "[TrackDraw] Account activity update failed",
      {
        error_name: "Error",
      }
    );
  });
});

describe("account inactivity guard", () => {
  it("protects a long-lived valid session even when activity and login creation are stale", async () => {
    sqlite.exec(
      `insert into sessions values ('pilot', '2024-01-01', '2024-01-01', '2026-10-04T12:00:00.000Z')`
    );
    expect(
      await isAccountInactive(adapter(), "pilot", inactiveBefore, now)
    ).toBe(false);
  });

  it("protects an account if any session is valid while others have expired", async () => {
    sqlite.exec(`insert into sessions values
      ('pilot', '2024-01-01', '2024-01-01', '2025-01-01'),
      ('pilot', '2024-01-01', '2024-01-01', '2026-10-03T12:00:00.001Z')`);
    expect(
      await isAccountInactive(adapter(), "pilot", inactiveBefore, now)
    ).toBe(false);
  });

  it.each(["2026-10-03T12:00:00.000Z", "2025-01-01"])(
    "allows inactivity only after all sessions have expired: %s",
    async (expiry) => {
      sqlite
        .prepare("insert into sessions(userId, expiresAt) values ('pilot', ?)")
        .run(expiry);
      expect(
        await isAccountInactive(adapter(), "pilot", inactiveBefore, now)
      ).toBe(true);
    }
  );

  it("does not let another account's session protect an inactive account", async () => {
    sqlite.exec(
      `insert into sessions(userId, expiresAt) values ('other', '2026-10-04')`
    );
    expect(
      await isAccountInactive(adapter(), "pilot", inactiveBefore, now)
    ).toBe(true);
  });

  it.each([null, "invalid-date", "2025-10-03T12:00:00.000Z", "2026-10-03"])(
    "fails closed for unknown or insufficiently old activity: %s",
    async (activity) => {
      sqlite.prepare("update users set last_active_at = ?").run(activity);
      expect(
        await isAccountInactive(adapter(), "pilot", inactiveBefore, now)
      ).toBe(false);
    }
  );

  it.each([null, "invalid-date"])(
    "fails closed for an unknown session expiry: %s",
    async (expiry) => {
      sqlite
        .prepare("insert into sessions(userId, expiresAt) values ('pilot', ?)")
        .run(expiry);
      expect(
        await isAccountInactive(adapter(), "pilot", inactiveBefore, now)
      ).toBe(false);
    }
  );

  it("does not classify missing accounts as inactive", async () => {
    expect(
      await isAccountInactive(adapter(), "missing", inactiveBefore, now)
    ).toBe(false);
  });
});

describe("account activity migration", () => {
  it("provides an adoption grace period and preserves later reliable timestamps", () => {
    sqlite.exec(`
      drop table users;
      create table users(id text primary key, createdAt text, updatedAt text);
      insert into users values
        ('old', '2024-01-01', '2099-01-01'),
        ('missing-history', null, null),
        ('invalid-history', 'invalid', '2099-01-01'),
        ('later-session', '2024-01-01', '2024-01-01'),
        ('later-creation', '2027-01-01', '2027-01-01');
      insert into sessions values
        ('old', '2024-01-01', '2024-01-01', '2024-01-02'),
        ('invalid-history', 'invalid', 'invalid', 'invalid'),
        ('later-session', '2026-10-04', '2026-10-05', '2026-10-06');
    `);
    const migration = readFileSync(
      new URL("../../../migrations/0021_account_activity.sql", import.meta.url),
      "utf8"
    ).replaceAll("'now'", "'2026-10-03T12:00:00.000Z'");
    sqlite.exec(migration);
    expect(
      sqlite.prepare("select id, last_active_at from users order by id").all()
    ).toEqual([
      { id: "invalid-history", last_active_at: now.toISOString() },
      { id: "later-creation", last_active_at: "2027-01-01T00:00:00.000Z" },
      { id: "later-session", last_active_at: "2026-10-05T00:00:00.000Z" },
      { id: "missing-history", last_active_at: now.toISOString() },
      { id: "old", last_active_at: now.toISOString() },
    ]);
  });
});
