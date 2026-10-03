import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { recordAuthenticatedAccountActivity } from "@/lib/server/account-activity";
import { buildAccountRetentionEmail } from "@/lib/server/account-retention-email";
import { sendAccountRetentionNotices } from "@/lib/server/account-retention-notices";

import {
  addUtcCalendarMonths,
  formatAccountInactivity,
} from "@/lib/server/account-retention-timeline";

let sqlite: DatabaseSync;
let clock: Date;
let afterClaim: (() => void) | undefined;
let failSentWrite: boolean;
const send = vi.fn(
  async (
    _mail: Parameters<typeof import("@/lib/server/plunk").sendPlunkMail>[0]
  ) => {}
);

function adapter() {
  return {
    prepare(query: string) {
      const statement = sqlite.prepare(query);
      let bindings: SQLInputValue[] = [];
      const result = {
        bind(...values: unknown[]) {
          bindings = values as SQLInputValue[];
          return result;
        },
        first: async <T>() => {
          const row = statement.get(...bindings);
          if (query.includes("RETURNING id") && row) afterClaim?.();
          return (row as T) ?? null;
        },
        all: async <T>() => ({ results: statement.all(...bindings) as T[] }),
        run: async <T>() => {
          if (failSentWrite && query.includes("SET sent_at"))
            throw new Error("private email / database details");
          return statement.run(...bindings) as T;
        },
      };
      return result;
    },
  };
}
function run() {
  return sendAccountRetentionNotices(adapter(), { now: () => clock, send });
}
function notices() {
  return sqlite
    .prepare("select * from account_retention_notices order by stage")
    .all();
}
function activity(value: string | null) {
  sqlite
    .prepare("update users set last_active_at = ? where id = 'pilot'")
    .run(value);
}
function session(expiry: string | null, user = "pilot") {
  sqlite.prepare("insert into sessions values (?, ?)").run(user, expiry);
}

beforeEach(() => {
  clock = new Date("2026-10-03T12:00:00.000Z");
  afterClaim = undefined;
  failSentWrite = false;
  send.mockReset();
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    create table users (id text primary key, email text, name text, last_active_at text, marketing_opt_in integer default 0);
    create table sessions (userId text, expiresAt text);
    insert into users (id, email, name, last_active_at) values ('pilot', 'pilot@example.test', 'Pilot', '2025-11-03T12:00:00.000Z');
  `);
  sqlite.exec(
    readFileSync(
      new URL(
        "../../../migrations/0022_account_retention_notices.sql",
        import.meta.url
      ),
      "utf8"
    )
  );
});
afterEach(() => {
  sqlite.close();
  vi.unstubAllEnvs();
});

describe("account retention notices", () => {
  it("sends the first notice at eleven months, independently of marketing opt-in", async () => {
    clock = new Date("2026-10-03T11:59:59.999Z");
    await run();
    expect(send).not.toHaveBeenCalled();
    clock = new Date("2026-10-03T12:00:00.000Z");
    expect(await run()).toEqual({
      notice_health: { sent: 1, failed: 0, uncertain: 0 },
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { address: "pilot@example.test", name: "Pilot" },
        emailType: "account-retention",
        textBody: expect.stringContaining("3 November 2026 at 12:00 UTC"),
      })
    );
    expect(notices()).toHaveLength(1);
    expect(notices()[0].sent_at).toBe(clock.toISOString());
    await run();
    expect(send).toHaveBeenCalledTimes(1);
    sqlite.exec("update users set marketing_opt_in = 1");
    await run();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("sends the final notice exactly seven days before removal and never repeats either notice", async () => {
    await run();
    clock = new Date("2026-10-27T11:59:59.999Z");
    await run();
    expect(send).toHaveBeenCalledTimes(1);
    clock = new Date("2026-10-27T12:00:00.000Z");
    await run();
    expect(send).toHaveBeenCalledTimes(2);
    const final = send.mock.calls[1][0];
    expect(final.subject).toMatch(/^Final warning/);
    expect(final.textBody).toContain("3 November 2026 at 12:00 UTC");
    expect(final.idempotencyKey).not.toBe(send.mock.calls[0][0].idempotencyKey);
    clock = new Date("2026-12-01");
    await run();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it.each(["2026-10-03T12:00:00.001Z", "2099-01-01", "invalid", null])(
    "protects valid or unknown session expiry: %s",
    async (expiry) => {
      session("2024-01-01");
      session(expiry);
      await run();
      expect(send).not.toHaveBeenCalled();
      expect(notices()).toEqual([]);
    }
  );
  it("allows exactly expired sessions and ignores sessions of another account", async () => {
    session(clock.toISOString());
    session("2099-01-01", "other");
    await run();
    expect(send).toHaveBeenCalledOnce();
  });
  it.each([null, "invalid", "2026-01-01"])(
    "protects missing, invalid or recent activity: %s",
    async (value) => {
      activity(value);
      await run();
      expect(send).not.toHaveBeenCalled();
    }
  );
  it("protects a new valid session between selection and delivery", async () => {
    afterClaim = () => session("2099-01-01");
    await run();
    expect(send).not.toHaveBeenCalled();
    expect(notices()[0].sent_at).toBeNull();
  });
  it("refreshes the deadline of an unattempted notice after session protection ends", async () => {
    afterClaim = () => session("2026-12-01T00:00:00.000Z");
    await run();
    expect(notices()[0].attempted_at).toBeNull();
    afterClaim = undefined;
    clock = new Date("2026-12-01T12:00:00.000Z");
    await run();
    expect(send).toHaveBeenCalledOnce();
    expect(notices()[0].removal_at).toBe("2027-01-01T12:00:00.000Z");
  });

  it("cancels pending notices atomically on authenticated activity and starts a fresh future period", async () => {
    await run();
    clock = new Date("2026-10-27T12:00:00.000Z");
    await recordAuthenticatedAccountActivity(
      adapter(),
      { id: "pilot", lastActiveAt: "2025-11-03" },
      clock
    );
    expect(notices()).toEqual([]);
    await run();
    expect(send).toHaveBeenCalledTimes(1);
    clock = new Date("2027-09-27T12:00:00.000Z");
    await run();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].idempotencyKey).not.toBe(
      send.mock.calls[0][0].idempotencyKey
    );
    expect(send.mock.calls[1][0].textBody).toContain("27 October 2027");
  });
  it("does not deliver a notice when activity changes after its claim", async () => {
    afterClaim = () => activity(clock.toISOString());
    await run();
    expect(send).not.toHaveBeenCalled();
    expect(notices()).toEqual([]);
  });
  it("does not restore old warning state when activity changes while mail is in flight", async () => {
    send.mockImplementationOnce(async () => {
      activity(clock.toISOString());
    });
    await run();
    expect(notices()).toEqual([]);
    await run();
    expect(send).toHaveBeenCalledOnce();
  });
  it("prevents concurrent invocations from sending the same notice", async () => {
    await Promise.all([run(), run(), run()]);
    expect(send).toHaveBeenCalledOnce();
    expect(notices()).toHaveLength(1);
  });
  it("recovers an acknowledged-by-provider attempt with the same key inside the safe window", async () => {
    const delivered = new Set<string>();
    send.mockImplementation(async (mail) => {
      if (!delivered.has(mail.idempotencyKey!)) {
        delivered.add(mail.idempotencyKey!);
        throw new Error("private provider details");
      }
    });
    await expect(run()).rejects.toMatchObject({
      noticeHealth: { sent: 0, failed: 1, uncertain: 0 },
    });
    clock = new Date(clock.getTime() + 4 * 60_000);
    await run();
    expect(send).toHaveBeenCalledTimes(1); // Claim is still held.
    clock = new Date(clock.getTime() + 60_000);
    await run();
    expect(send).toHaveBeenCalledTimes(2);
    expect(delivered.size).toBe(1);
    expect(send.mock.calls[0][0].idempotencyKey).toBe(
      send.mock.calls[1][0].idempotencyKey
    );
    expect(notices()[0].sent_at).toBe(clock.toISOString());
  });
  it("recovers a failed sent-state write without a new provider key", async () => {
    failSentWrite = true;
    await expect(run()).rejects.toMatchObject({ noticeHealth: { failed: 1 } });
    failSentWrite = false;
    clock = new Date(clock.getTime() + 5 * 60_000);
    await run();
    expect(send.mock.calls[0][0].idempotencyKey).toBe(
      send.mock.calls[1][0].idempotencyKey
    );
    expect(notices()[0].sent_at).toBe(clock.toISOString());
  });
  it("never retries an ambiguous attempt beyond the provider window and reports no personal details", async () => {
    send.mockRejectedValueOnce(new Error("pilot@example.test sensitive data"));
    await expect(run()).rejects.toThrow("1 failed, 0 uncertain");
    clock = new Date(clock.getTime() + 23 * 60 * 60_000);
    await expect(run()).rejects.toThrow("0 failed, 1 uncertain");
    clock = new Date(clock.getTime() + 2 * 24 * 60 * 60_000);
    await expect(run()).rejects.not.toThrow("pilot@example.test");
    expect(send).toHaveBeenCalledOnce();
    expect(notices()[0].sent_at).toBeNull();
    activity(clock.toISOString());
    expect(notices()).toEqual([]);
    await run();
  });
  it("keeps processing other accounts after a send fails", async () => {
    sqlite.exec(
      "insert into users values ('second', 'second@example.test', 'Second', '2025-11-03T12:00:00.000Z', 0)"
    );
    send.mockRejectedValueOnce(new Error("failure"));
    await expect(run()).rejects.toMatchObject({
      noticeHealth: { sent: 1, failed: 1 },
    });
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("gives delayed warnings a full response period without sending both at once", async () => {
    clock = new Date("2027-01-03T12:00:00.000Z");
    await run();
    expect(send).toHaveBeenCalledOnce();
    expect(notices()[0].removal_at).toBe("2027-02-03T12:00:00.000Z");
    clock = new Date("2027-02-04T12:00:00.000Z");
    await run();
    expect(send).toHaveBeenCalledTimes(2);
    expect(notices()[0].removal_at).toBe("2027-02-11T12:00:00.000Z");
  });
  it("cascades notice records on account deletion", async () => {
    await run();
    sqlite.exec("delete from users");
    expect(notices()).toEqual([]);
  });
  it("requires a configured transactional sender before claiming any notice", async () => {
    vi.stubEnv("PLUNK_API_KEY", "");
    await expect(
      sendAccountRetentionNotices(adapter(), { now: () => clock })
    ).rejects.toThrow("require Plunk configuration");
    expect(notices()).toEqual([]);
  });
  it("bounds each invocation and makes progress through subsequent batches", async () => {
    for (let i = 0; i < 30; i++)
      sqlite
        .prepare(
          "insert into users values (?, ?, 'Pilot', '2025-11-03T12:00:00.000Z', 0)"
        )
        .run(`pilot-${i}`, `pilot-${i}@example.test`);
    await run();
    expect(send).toHaveBeenCalledTimes(25);
    await run();
    expect(send).toHaveBeenCalledTimes(31);
  });
});

describe("calendar boundaries and retention email", () => {
  it.each([
    ["2025-11-03T12:00:00Z", "2026-10-03T12:00:00Z", "11 months"],
    ["2025-11-03T12:00:00Z", "2026-10-27T12:00:00Z", "11 months"],
    ["2025-03-31T12:00:00Z", "2026-02-28T12:00:00Z", "11 months"],
    ["2025-11-03T12:00:00Z", "2027-01-04T12:00:00Z", "14 months"],
  ])("shows actual inactivity duration: %s", (activityAt, now, expected) => {
    expect(formatAccountInactivity(new Date(activityAt), new Date(now))).toBe(
      expected
    );
  });

  it.each([
    ["2024-02-29T12:00:00.000Z", 12, "2025-02-28T12:00:00.000Z"],
    ["2025-01-31T12:00:00.000Z", 1, "2025-02-28T12:00:00.000Z"],
    ["2025-03-31T12:00:00.000Z", 11, "2026-02-28T12:00:00.000Z"],
  ])("clamps calendar months: %s", (value, months, expected) => {
    expect(
      addUtcCalendarMonths(new Date(value), Number(months)).toISOString()
    ).toBe(expected);
  });
  it("finds end-of-month accounts whose inverse month subtraction would skip them", async () => {
    activity("2025-03-31T12:00:00.000Z");
    clock = new Date("2026-02-28T12:00:00.000Z");
    await run();
    expect(send).toHaveBeenCalledOnce();
    expect(notices()[0].removal_at).toBe("2026-03-31T12:00:00.000Z");
  });
  it.each(["first", "final"] as const)(
    "includes a concrete UTC deadline and normal sign-in action: %s",
    (stage) => {
      const mail = buildAccountRetentionEmail(
        stage,
        new Date("2026-11-03T00:17:00.000Z"),
        new Date("2025-11-03T00:17:00.000Z"),
        new Date("2026-10-27T00:17:00.000Z")
      );
      for (const body of [mail.htmlBody, mail.textBody]) {
        expect(body).toContain("3 November 2026 at 00:17 UTC");
        if (stage === "first")
          expect(body).toContain("inactive for about 11 months.");
        else {
          expect(body).toContain("This is the final warning");
          expect(body).not.toContain("months");
        }
        expect(body).toContain("Sign in to keep your account");
        expect(body).toContain("/login?callbackURL=%2Fstudio");
        expect(body).toContain("independent of marketing preferences");
      }
    }
  );
});
