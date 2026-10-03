import { readFileSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { sendAccountRetentionNotices } from "@/lib/server/account-retention-notices";
import {
  cleanupInactiveAccounts,
  deleteUserAccount,
} from "@/lib/server/account-deletion";

let sqlite: DatabaseSync;
let clock: Date;
const send = vi.fn(async () => {});
const bucket = { delete: vi.fn(async () => {}) };
const db = () => sqliteD1(sqlite);
const notices = () =>
  sendAccountRetentionNotices(db(), {
    now: () => clock,
    mailer: { isConfigured: () => true, send },
  });
function user(id = "pilot") {
  sqlite
    .prepare(
      `INSERT INTO users (id,email,name,createdAt,updatedAt,last_active_at)
    VALUES (?, ?, 'Pilot Name', '2025-11-01', '2025-11-01', '2025-11-01T00:00:00.000Z')`
    )
    .run(id, `${id}@example.test`);
}
type Event = {
  id: string;
  event_type: string;
  entity_id: string;
  target_user_id: string | null;
  actor_user_id: string | null;
  actor_kind: string;
  target_label: string;
  metadata_json: string;
  created_at: string;
};
function events() {
  return sqlite
    .prepare("SELECT * FROM audit_events ORDER BY created_at, id")
    .all() as Event[];
}
function metadata(event: Event) {
  return JSON.parse(event.metadata_json) as Record<string, unknown>;
}
async function bothWarnings() {
  await notices();
  clock = new Date("2026-10-25T00:00:00.000Z");
  await notices();
  clock = new Date("2026-11-01T00:00:00.000Z");
}

beforeEach(() => {
  sqlite = createMigratedDatabase();
  clock = new Date("2026-10-01T00:00:00.000Z");
  send.mockReset();
  bucket.delete.mockReset();
  user();
});
afterEach(() => sqlite.close());

describe("durable account lifecycle audit", () => {
  it("retains warning attempts and both provider acknowledgments across reactivation", async () => {
    await bothWarnings();
    const original = events();
    expect(original.map((event) => event.event_type)).toEqual([
      "account.retention.notice.attempted",
      "account.retention.first_notice.sent",
      "account.retention.notice.attempted",
      "account.retention.final_notice.sent",
    ]);
    expect(new Set(original.map((event) => event.entity_id)).size).toBe(1);
    expect(original.every((event) => event.target_user_id === "pilot")).toBe(
      true
    );
    expect(metadata(original[1])).toMatchObject({
      stage: "first",
      status: "provider_accepted",
      removalAt: "2026-11-01T00:00:00.000Z",
    });

    sqlite.exec(
      "UPDATE users SET last_active_at = '2026-11-01T00:00:00.000Z' WHERE id = 'pilot'"
    );
    expect(
      sqlite.prepare("SELECT * FROM account_retention_notices").all()
    ).toEqual([]);
    expect(events()).toEqual(original);
    clock = new Date("2027-10-01T00:00:00.000Z");
    await notices();
    expect(events()).toHaveLength(6);
    expect(new Set(events().map((event) => event.entity_id)).size).toBe(1);
  });

  it("keeps a linked, minimized deletion trail after automatic deletion and retries", async () => {
    await bothWarnings();
    await cleanupInactiveAccounts(db(), bucket, { now: () => clock });
    await cleanupInactiveAccounts(db(), bucket, { now: () => clock });
    const history = events();
    expect(history).toHaveLength(5);
    const deletion = history.find(
      (event) => event.event_type === "account.deleted"
    )!;
    expect(deletion).toMatchObject({
      actor_kind: "system",
      target_user_id: null,
      created_at: clock.toISOString(),
    });
    expect(metadata(deletion)).toEqual({
      initiatedBy: "inactivity",
      firstNoticeSentAt: "2026-10-01T00:00:00.000Z",
      finalNoticeSentAt: "2026-10-25T00:00:00.000Z",
    });
    expect(
      history.every(
        (event) =>
          event.target_user_id === null &&
          event.target_label.includes(event.entity_id)
      )
    ).toBe(true);
    expect(new Set(history.map((event) => event.entity_id)).size).toBe(1);
    expect(JSON.stringify(history)).not.toMatch(
      /pilot|Pilot Name|example\.test/
    );
    for (const table of ["users", "account_retention_notices"])
      expect(sqlite.prepare(`SELECT * FROM ${table}`).all()).toEqual([]);
  });

  it("records direct self-deletion once, before media cleanup can fail", async () => {
    await notices();
    sqlite.exec("DELETE FROM users WHERE id = 'pilot'");
    const deletion = events().filter(
      (event) => event.event_type === "account.deleted"
    );
    expect(deletion).toHaveLength(1);
    expect(metadata(deletion[0])).toMatchObject({ initiatedBy: "self" });
    expect(deletion[0]).toMatchObject({
      actor_kind: "user",
      actor_user_id: null,
    });
    expect(await deleteUserAccount(db(), "pilot")).toBe(false);
    expect(events()).toHaveLength(3);
  });

  it("records the admin and counts atomically and preserves history if the admin is later deleted", async () => {
    await notices();
    user("admin");
    await deleteUserAccount(db(), "pilot", undefined, {
      actorUserId: "admin",
      metadata: {
        role: "user",
        projectCount: 2,
        activeShareCount: 1,
        galleryEntryCount: 0,
        apiKeyCount: 1,
      },
    });
    const deletion = events().find(
      (event) => event.event_type === "account.deleted"
    )!;
    expect(deletion.actor_user_id).toBe("admin");
    expect(metadata(deletion)).toMatchObject({
      initiatedBy: "admin",
      projectCount: 2,
      role: "user",
    });
    sqlite.exec("DELETE FROM users WHERE id = 'admin'");
    expect(
      events().find((event) => event.id === deletion.id)?.actor_user_id
    ).toBeNull();
    expect(
      events().filter((event) => event.entity_id === deletion.entity_id)
    ).toHaveLength(3);
  });

  it("rolls back deletion, identity detachment and all provisional events if the audit insert fails", async () => {
    await bothWarnings();
    const history = events();
    sqlite.exec(`CREATE TRIGGER fail_audit BEFORE INSERT ON audit_events
      WHEN NEW.event_type = 'account.deleted' BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END;`);
    await expect(
      cleanupInactiveAccounts(db(), bucket, { now: () => clock })
    ).rejects.toThrow("1 failed accounts");
    expect(sqlite.prepare("SELECT id FROM users").all()).toEqual([
      { id: "pilot" },
    ]);
    expect(events()).toEqual(history);
    expect(
      events().filter((event) => event.event_type === "account.deleted")
    ).toEqual([]);
    expect(() => sqlite.exec("DELETE FROM users WHERE id = 'pilot'")).toThrow(
      "audit unavailable"
    );
    expect(events()).toEqual(history);
  });

  it("does not write a deletion event when new activity wins the eligibility race", async () => {
    await bothWarnings();
    const history = events();
    const racing = sqliteD1(sqlite, (query) => {
      if (query.startsWith("DELETE FROM users AS"))
        sqlite.exec(
          "UPDATE users SET last_active_at = '2026-11-01T00:00:00.000Z' WHERE id = 'pilot'"
        );
    });
    expect(
      (await cleanupInactiveAccounts(racing, bucket, { now: () => clock })).meta
        .changes
    ).toBe(0);
    expect(events()).toEqual(history);
    expect(
      events().filter((event) => event.event_type === "account.deleted")
    ).toEqual([]);
  });

  it("records an unacknowledged attempt honestly and deduplicates successful retries", async () => {
    send.mockRejectedValueOnce(new Error("provider response lost"));
    await expect(notices()).rejects.toThrow("1 failed");
    expect(events().map((event) => event.event_type)).toEqual([
      "account.retention.notice.attempted",
    ]);
    clock = new Date(clock.getTime() + 5 * 60_000);
    await notices();
    await notices();
    expect(events()).toHaveLength(2);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("rolls back acknowledgment if its audit fails and safely retries without duplicate audit events", async () => {
    sqlite.exec(`CREATE TRIGGER fail_ack BEFORE INSERT ON audit_events
      WHEN NEW.event_type LIKE 'account.retention.%notice.sent'
      BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END;`);
    await expect(notices()).rejects.toThrow("1 failed");
    expect(
      sqlite.prepare("SELECT sent_at FROM account_retention_notices").get()
        ?.sent_at
    ).toBeNull();
    expect(events()).toHaveLength(1);
    sqlite.exec("DROP TRIGGER fail_ack");
    clock = new Date(clock.getTime() + 5 * 60_000);
    await notices();
    expect(events()).toHaveLength(2);
  });

  it.each(["reactivation", "deletion"])(
    "retains confirmed acceptance when %s removes an in-flight notice",
    async (change) => {
      send.mockImplementationOnce(async () => {
        sqlite.exec(
          change === "deletion"
            ? "DELETE FROM users WHERE id = 'pilot'"
            : "UPDATE users SET last_active_at = '2026-10-01T00:00:00.000Z' WHERE id = 'pilot'"
        );
      });
      await notices();
      const acknowledgment = events().find(
        (event) => event.event_type === "account.retention.first_notice.sent"
      )!;
      expect(metadata(acknowledgment).status).toBe("provider_accepted");
      expect(
        events().every((event) => event.entity_id === acknowledgment.entity_id)
      ).toBe(true);
      expect(acknowledgment.target_user_id).toBe(
        change === "deletion" ? null : "pilot"
      );
      expect(
        sqlite.prepare("SELECT * FROM account_retention_notices").all()
      ).toEqual([]);
    }
  );

  it("backfills remaining evidence with its original dates and audits direct reconciliation", () => {
    sqlite.close();
    sqlite = createMigratedDatabase("0023_account_deletion.sql");
    user();
    sqlite.exec(`INSERT INTO account_retention_notices (id,user_id,activity_at,stage,removal_at,attempted_at,sent_at)
      VALUES ('first','pilot','2025-11-01T00:00:00.000Z','first','2026-11-01T00:00:00.000Z','2026-10-01T00:00:00.000Z','2026-10-01T00:01:00.000Z'),
      ('final','pilot','2025-11-01T00:00:00.000Z','final','2026-11-01T00:00:00.000Z','2026-10-25T00:00:00.000Z',NULL);`);
    sqlite.exec(
      readFileSync(
        new URL(
          "../../../migrations/0024_account_lifecycle_audit.sql",
          import.meta.url
        ),
        "utf8"
      )
    );
    expect(events()).toHaveLength(3);
    expect(events()[1].created_at).toBe("2026-10-01T00:01:00.000Z");
    sqlite.exec(
      "UPDATE account_retention_notices SET sent_at = '2026-10-25T00:01:00.000Z' WHERE id = 'final'"
    );
    sqlite.exec("UPDATE account_retention_notices SET sent_at = sent_at");
    expect(events()).toHaveLength(4);
  });
});
