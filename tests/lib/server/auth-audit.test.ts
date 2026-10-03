import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/audit", () => ({ recordAuditEvent: vi.fn() }));

import {
  recordAccountEmailChanged,
  recordPasskeyMutation,
} from "@/lib/server/auth-audit";
import { recordAuditEvent } from "@/lib/server/audit";

const user = { id: "user-1", email: "pilot@example.com" };

describe("auth audit events", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records only safe passkey registration metadata", async () => {
    await recordPasskeyMutation({
      path: "/passkey/verify-registration",
      user,
      body: { response: { publicKey: "must-not-be-audited" } },
      returned: {
        id: "passkey-1",
        name: "MacBook",
        publicKey: "must-not-be-audited",
      },
    });

    expect(recordAuditEvent).toHaveBeenCalledWith({
      actorUserId: "user-1",
      targetUserId: "user-1",
      eventType: "credential.passkey.added",
      entityType: "passkey",
      entityId: "passkey-1",
      metadata: { name: "MacBook" },
    });
  });

  it("records passkey rename and removal using only the credential id", async () => {
    await recordPasskeyMutation({
      path: "/passkey/update-passkey",
      user,
      body: { id: "passkey-1", name: "Phone" },
      returned: null,
    });
    await recordPasskeyMutation({
      path: "/passkey/delete-passkey",
      user,
      body: { id: "passkey-1" },
      returned: null,
    });

    expect(recordAuditEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        eventType: "credential.passkey.renamed",
        entityId: "passkey-1",
        metadata: { name: "Phone" },
      })
    );
    expect(recordAuditEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        eventType: "credential.passkey.removed",
        entityId: "passkey-1",
        metadata: null,
      })
    );
  });

  it("records email changes", async () => {
    await recordAccountEmailChanged(
      {
        id: user.id,
        email: "new@example.com",
      },
      "pilot@example.com"
    );

    expect(recordAuditEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        eventType: "account.email.changed",
        metadata: {
          previousEmail: "pilot@example.com",
          newEmail: "new@example.com",
        },
      })
    );
  });
});
