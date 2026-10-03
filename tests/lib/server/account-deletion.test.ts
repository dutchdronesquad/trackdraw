import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import {
  cleanupInactiveAccounts,
  cleanupAccountDeletionMedia,
  deleteUserAccount,
} from "@/lib/server/account-deletion";

let sqlite: DatabaseSync;
let clock: Date;
let beforeQuery: ((query: string) => void) | undefined;
const bucket = { delete: vi.fn(async (_key: string) => {}) };
const activityAt = "2025-10-03T12:00:00.000Z";
const due = "2026-10-03T12:00:00.000Z";
const db = () => sqliteD1(sqlite, beforeQuery);
const run = () => cleanupInactiveAccounts(db(), bucket, { now: () => clock });
function user(id = "pilot", activity = activityAt) {
  sqlite
    .prepare(
      "INSERT INTO users (id,email,name,createdAt,updatedAt,last_active_at) VALUES (?,?,?,?,?,?)"
    )
    .run(id, `${id}@example.test`, id, activity, activity, activity);
}
function warned(id = "pilot", activity = activityAt, deadline = due) {
  for (const stage of ["first", "final"]) {
    sqlite
      .prepare(
        "INSERT INTO account_retention_notices (id,user_id,activity_at,stage,removal_at,sent_at) VALUES (?,?,?,?,?,?)"
      )
      .run(
        `${id}-${stage}`,
        id,
        activity,
        stage,
        deadline,
        stage === "first"
          ? "2026-09-03T12:00:00.000Z"
          : "2026-09-26T12:00:00.000Z"
      );
  }
}
function exists(id = "pilot") {
  return Boolean(sqlite.prepare("SELECT id FROM users WHERE id = ?").get(id));
}
function session(expiry: string, id = "pilot") {
  sqlite
    .prepare(
      "INSERT INTO sessions (id,userId,token,expiresAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?)"
    )
    .run(`${id}-session`, id, `${id}-token`, expiry, activityAt, activityAt);
}
function ownedData() {
  sqlite.exec(`
    INSERT INTO projects (id,owner_user_id,title,design_json,created_at,updated_at,archived_at)
      VALUES ('project','pilot','Archived','{}','2025-01-01','2025-01-01','2025-02-01');
    INSERT INTO shares (id,token,design_json,created_at,updated_at,published_at,owner_user_id,project_id,share_type)
      VALUES ('share','owned-token','{}','2025-01-01','2025-01-01','2025-01-01','pilot','project','published'),
      ('anonymous-share','project-token','{}','2025-01-01','2025-01-01','2025-01-01',NULL,'project','temporary');
    INSERT INTO gallery_entries (id,share_token,owner_user_id,gallery_state,gallery_title,gallery_description,gallery_preview_image,created_at,updated_at)
      VALUES ('entry','owned-token','pilot','featured','Public','Track','gallery/previews/entry.webp','2025-01-01','2025-01-01');
    INSERT INTO embed_referrer_daily VALUES ('owned-token','example.test','2026-10-01',1,'2026-10-01','2026-10-01');
    INSERT INTO accounts (id,userId,accountId,providerId,createdAt,updatedAt)
      VALUES ('account','pilot','external','provider','2025-01-01','2025-01-01');
    INSERT INTO passkey (id,publicKey,userId,credentialID,counter,deviceType,createdAt)
      VALUES ('passkey','public-key','pilot','credential',0,'singleDevice','2025-01-01');
    INSERT INTO apikey (id,referenceId,key,createdAt,updatedAt) VALUES ('key','pilot','secret','2025-01-01','2025-01-01');
    INSERT INTO layout_presets (id,owner_user_id,name,shapes_json,created_at,updated_at)
      VALUES ('preset','pilot','Preset','[]','2025-01-01','2025-01-01');
    INSERT INTO product_metric_creator_activations VALUES ('pilot','2025-01-01');
    INSERT INTO product_events (id,event_type,user_id,project_id,share_token,created_at)
      VALUES ('user-event','studio.opened','pilot',NULL,NULL,'2026-10-01'),
      ('project-event','studio.opened',NULL,'project',NULL,'2026-10-01'),
      ('share-event','share.viewed',NULL,NULL,'project-token','2026-10-01');
    INSERT INTO audit_events (id,actor_user_id,target_user_id,event_type,entity_type,entity_id,created_at)
      VALUES ('audit','pilot',NULL,'share.published','share','owned-token','2025-01-01'),
      ('key-audit',NULL,NULL,'credential.api_key.created','api_key','key','2025-01-01'),
      ('gallery-audit',NULL,NULL,'gallery.listed','gallery_entry','entry','2025-01-01');
    INSERT INTO verifications (id,identifier,value,expiresAt,createdAt,updatedAt)
      VALUES ('magic','hash','{"email":"PILOT@example.test"}','2027-01-01','2025-01-01','2025-01-01'),
      ('delete-verification','delete-account-token','pilot','2027-01-01','2025-01-01','2025-01-01'),
      ('passkey-verification','challenge','{"userData":{"id":"pilot"}}','2027-01-01','2025-01-01','2025-01-01');
  `);
  session("2025-11-01");
}
beforeEach(() => {
  sqlite = createMigratedDatabase();
  clock = new Date(due);
  beforeQuery = undefined;
  bucket.delete.mockReset();
  user();
  warned();
});
afterEach(() => sqlite.close());

describe("account deletion lifecycle", () => {
  it("preserves other accounts' content and unrelated anonymous shares", async () => {
    ownedData();
    user("survivor", "2026-10-01");
    sqlite.exec(`
      INSERT INTO shares (id,token,design_json,created_at,updated_at,published_at,owner_user_id,share_type)
        VALUES ('other-share','other-token','{}','2026-10-01','2026-10-01','2026-10-01','survivor','published'),
        ('anonymous-unrelated','anonymous-token','{}','2026-10-01','2026-10-01','2026-10-01',NULL,'temporary');
      INSERT INTO gallery_entries (id,share_token,owner_user_id,gallery_state,gallery_title,gallery_description,gallery_preview_image,created_at,updated_at)
        VALUES ('other-entry','other-token','survivor','listed','Other','Track','gallery/previews/other-entry.webp','2026-10-01','2026-10-01');
    `);
    await run();
    expect(
      sqlite.prepare("SELECT token FROM shares ORDER BY token").all()
    ).toEqual([{ token: "anonymous-token" }, { token: "other-token" }]);
    expect(sqlite.prepare("SELECT id FROM gallery_entries").all()).toEqual([
      { id: "other-entry" },
    ]);
    expect(bucket.delete).toHaveBeenCalledTimes(1);
    expect(bucket.delete).toHaveBeenCalledWith("gallery/previews/entry.webp");
  });
  it("refuses deletion when the lifecycle migration is incomplete", async () => {
    sqlite.exec("DROP TRIGGER account_deleted_data");
    await expect(deleteUserAccount(db(), "pilot")).rejects.toThrow(
      "requires migration 0023"
    );
    expect(exists()).toBe(true);
  });

  it("protects stale warning periods even when the activity reset trigger did not run", async () => {
    sqlite.exec(
      "DROP TRIGGER account_retention_notices_reactivated; UPDATE users SET last_active_at = '2025-09-01' WHERE id = 'pilot'"
    );
    await run();
    expect(exists()).toBe(true);
  });

  it("continues deleting other eligible accounts after an individual database failure", async () => {
    user("second");
    warned("second");
    sqlite.exec(
      "CREATE TRIGGER fail_one_account BEFORE DELETE ON users WHEN OLD.id = 'pilot' BEGIN SELECT RAISE(ABORT, 'private account'); END"
    );
    await expect(run()).rejects.toThrow("1 failed accounts");
    expect(exists()).toBe(true);
    expect(exists("second")).toBe(false);
  });

  it("keeps media keys pending if the bucket binding is missing", async () => {
    ownedData();
    await deleteUserAccount(db(), "pilot");
    await expect(cleanupAccountDeletionMedia(db(), undefined)).rejects.toThrow(
      "requires MEDIA_BUCKET"
    );
    expect(
      sqlite.prepare("SELECT * FROM account_deletion_media").all()
    ).toHaveLength(1);
  });

  it("deletes at exactly twelve calendar months, including all owned content and auth data", async () => {
    ownedData();
    user("survivor", "2026-10-01");
    sqlite.exec(
      "INSERT INTO verifications VALUES ('other-verification','other','not-json','2027-01-01','2025-01-01','2025-01-01')"
    );
    clock = new Date("2026-10-03T11:59:59.999Z");
    expect((await run()).meta.changes).toBe(0);
    expect(exists()).toBe(true);
    clock = new Date(due);
    expect((await run()).meta.changes).toBe(1);
    expect(exists()).toBe(false);
    expect(exists("survivor")).toBe(true);
    for (const table of [
      "projects",
      "shares",
      "gallery_entries",
      "apikey",
      "sessions",
      "accounts",
      "passkey",
      "layout_presets",
      "product_events",
      "audit_events",
      "embed_referrer_daily",
      "product_metric_creator_activations",
      "account_retention_notices",
      "account_deletion_media",
    ]) {
      expect(
        sqlite.prepare(`SELECT count(*) AS count FROM ${table}`).get()?.count,
        table
      ).toBe(0);
    }
    expect(sqlite.prepare("SELECT id FROM verifications").all()).toEqual([
      { id: "other-verification" },
    ]);
    expect(bucket.delete).toHaveBeenCalledWith("gallery/previews/entry.webp");
    expect((await run()).meta.changes).toBe(0);
    expect(bucket.delete).toHaveBeenCalledTimes(1);
  });

  it.each(["2026-10-03T12:00:00.001Z", "unknown"])(
    "protects valid or unknown session expiry: %s",
    async (expiry) => {
      session(expiry);
      await run();
      expect(exists()).toBe(true);
    }
  );
  it("allows a session expiring exactly at deletion time", async () => {
    session(due);
    await run();
    expect(exists()).toBe(false);
  });
  it.each(["first", "final"])(
    "requires acknowledged %s notice",
    async (stage) => {
      sqlite
        .prepare(
          "UPDATE account_retention_notices SET sent_at = NULL WHERE stage = ?"
        )
        .run(stage);
      await run();
      expect(exists()).toBe(true);
    }
  );
  it("honors an extended final deadline and the full grace after acknowledgment", async () => {
    sqlite.exec(
      "UPDATE account_retention_notices SET removal_at = '2026-10-10T12:00:00.000Z', sent_at = '2026-10-03T12:00:00.000Z' WHERE stage = 'final'"
    );
    await run();
    expect(exists()).toBe(true);
    clock = new Date("2026-10-10T11:59:59.999Z");
    await run();
    expect(exists()).toBe(true);
    clock = new Date("2026-10-10T12:00:00.000Z");
    await run();
    expect(exists()).toBe(false);
  });
  it("requires the first notice's deadline too", async () => {
    sqlite.exec(
      "UPDATE account_retention_notices SET removal_at = '2026-11-03' WHERE stage = 'first'"
    );
    await run();
    expect(exists()).toBe(true);
  });
  it.each(["NULL", "'invalid'"])(
    "fails closed for unknown activity %s",
    async (activity) => {
      sqlite.exec(
        `UPDATE users SET last_active_at = ${activity} WHERE id = 'pilot'`
      );
      await run();
      expect(exists()).toBe(true);
    }
  );
  it("reactivation invalidates notice state", async () => {
    sqlite.exec(
      "UPDATE users SET last_active_at = '2026-10-03T11:00:00.000Z' WHERE id = 'pilot'"
    );
    await run();
    expect(exists()).toBe(true);
    expect(
      sqlite.prepare("SELECT * FROM account_retention_notices").all()
    ).toEqual([]);
  });
  it.each(["activity", "session"])(
    "rechecks %s immediately before the destructive statement",
    async (change) => {
      ownedData();
      beforeQuery = (query) => {
        if (!query.startsWith("DELETE FROM users AS")) return;
        beforeQuery = undefined;
        if (change === "activity")
          sqlite.exec(
            "UPDATE users SET last_active_at = '2026-10-03T12:00:00.000Z' WHERE id = 'pilot'"
          );
        else
          sqlite.exec(
            "UPDATE sessions SET expiresAt = '2027-01-01' WHERE userId = 'pilot'"
          );
      };
      await run();
      expect(exists()).toBe(true);
      expect(sqlite.prepare("SELECT id FROM projects").all()).toHaveLength(1);
      expect(bucket.delete).not.toHaveBeenCalled();
    }
  );
  it("rolls back every deletion if any part of the lifecycle fails", async () => {
    ownedData();
    sqlite.exec(
      "CREATE TRIGGER fail_deletion BEFORE DELETE ON projects BEGIN SELECT RAISE(ABORT, 'private database details'); END"
    );
    await expect(run()).rejects.toThrow("1 failed accounts");
    expect(exists()).toBe(true);
    expect(sqlite.prepare("SELECT * FROM gallery_entries").all()).toHaveLength(
      1
    );
    expect(sqlite.prepare("SELECT * FROM verifications").all()).toHaveLength(3);
    expect(
      sqlite.prepare("SELECT * FROM account_deletion_media").all()
    ).toHaveLength(0);
    expect(bucket.delete).not.toHaveBeenCalled();
  });
  it("retains failed R2 keys for retry without a recoverable account", async () => {
    ownedData();
    bucket.delete.mockRejectedValueOnce(new Error("private key"));
    await expect(run()).rejects.toThrow("1 failed deletions");
    expect(exists()).toBe(false);
    expect(sqlite.prepare("SELECT * FROM projects").all()).toHaveLength(0);
    expect(
      sqlite.prepare("SELECT * FROM account_deletion_media").all()
    ).toHaveLength(1);
    await cleanupAccountDeletionMedia(db(), bucket);
    expect(
      sqlite.prepare("SELECT * FROM account_deletion_media").all()
    ).toHaveLength(0);
  });
  it("uses the same database lifecycle for manual and direct Better Auth deletion", async () => {
    ownedData();
    expect(await deleteUserAccount(db(), "pilot")).toBe(true);
    expect(await deleteUserAccount(db(), "pilot")).toBe(false);
    expect(sqlite.prepare("SELECT * FROM shares").all()).toHaveLength(0);
    user();
    ownedData();
    sqlite.exec("DELETE FROM users WHERE id = 'pilot'");
    expect(sqlite.prepare("SELECT * FROM shares").all()).toHaveLength(0);
    expect(sqlite.prepare("SELECT * FROM verifications").all()).toHaveLength(0);
  });
  it("clamps leap-day anniversaries to February's last day", async () => {
    sqlite.exec(
      "UPDATE users SET last_active_at = '2024-02-29T12:00:00.000Z' WHERE id = 'pilot'"
    );
    warned("pilot", "2024-02-29T12:00:00.000Z", "2025-02-28T12:00:00.000Z");
    sqlite.exec(
      "UPDATE account_retention_notices SET sent_at = CASE stage WHEN 'first' THEN '2025-01-29T12:00:00.000Z' ELSE '2025-02-21T12:00:00.000Z' END"
    );
    clock = new Date("2025-02-28T11:59:59.999Z");
    await run();
    expect(exists()).toBe(true);
    clock = new Date("2025-02-28T12:00:00.000Z");
    await run();
    expect(exists()).toBe(false);
  });
});
