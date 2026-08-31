import "server-only";

import { auditEventTypes } from "@/lib/audit-events";
import { recordAuditEvent } from "@/lib/server/audit";

type AuthAuditUser = {
  id: string;
  email: string;
};

type PasskeyAuditUser = {
  id: string;
};

export async function recordSelfAccountDeleted(user: AuthAuditUser) {
  return recordAuditEvent({
    actorKind: "user",
    actorLabel: user.email,
    actorUserId: null,
    targetUserId: null,
    targetLabel: user.email,
    eventType: auditEventTypes.accountDeleted,
    entityType: "user",
    entityId: user.id,
    metadata: {
      initiatedBy: "self",
      email: user.email,
    },
  });
}

export async function recordAccountEmailChanged(
  user: AuthAuditUser,
  previousEmail: string
) {
  return recordAuditEvent({
    actorUserId: user.id,
    targetUserId: user.id,
    eventType: auditEventTypes.accountEmailChanged,
    entityType: "user",
    entityId: user.id,
    metadata: { previousEmail, newEmail: user.email },
  });
}

export async function recordPasskeyMutation(input: {
  path: string;
  user: PasskeyAuditUser;
  body: unknown;
  returned: unknown;
}) {
  const returned = input.returned as
    { id?: unknown; name?: unknown; passkey?: { id?: unknown } } | undefined;
  const body = input.body as { id?: unknown; name?: unknown } | undefined;

  if (input.path === "/passkey/verify-registration") {
    const passkeyId =
      typeof returned?.id === "string"
        ? returned.id
        : typeof returned?.passkey?.id === "string"
          ? returned.passkey.id
          : null;
    return recordAuditEvent({
      actorUserId: input.user.id,
      targetUserId: input.user.id,
      eventType: auditEventTypes.passkeyAdded,
      entityType: "passkey",
      entityId: passkeyId,
      metadata: {
        name: typeof returned?.name === "string" ? returned.name : null,
      },
    });
  }

  if (input.path === "/passkey/update-passkey") {
    return recordAuditEvent({
      actorUserId: input.user.id,
      targetUserId: input.user.id,
      eventType: auditEventTypes.passkeyRenamed,
      entityType: "passkey",
      entityId: typeof body?.id === "string" ? body.id : null,
      metadata: {
        name: typeof body?.name === "string" ? body.name : null,
      },
    });
  }

  if (input.path === "/passkey/delete-passkey") {
    return recordAuditEvent({
      actorUserId: input.user.id,
      targetUserId: input.user.id,
      eventType: auditEventTypes.passkeyRemoved,
      entityType: "passkey",
      entityId: typeof body?.id === "string" ? body.id : null,
      metadata: null,
    });
  }

  return false;
}
