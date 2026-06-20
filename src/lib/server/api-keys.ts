import "server-only";

import { getAuth } from "@/lib/server/auth";
import { getDatabase } from "@/lib/server/db";

export const apiKeyExpiryDayOptions = [7, 30, 90, 365] as const;
export type ApiKeyExpiryDays = (typeof apiKeyExpiryDayOptions)[number];

export type ApiKeyPermissionSet = Record<string, string[]>;

export const trackReadPermission: ApiKeyPermissionSet = {
  tracks: ["read"],
};

type AuthApi = Awaited<ReturnType<typeof getAuth>>["api"];
type CreateApiKeyResult = Awaited<ReturnType<AuthApi["createApiKey"]>>;
type ListApiKeysResult = Awaited<ReturnType<AuthApi["listApiKeys"]>>;
type VerifyApiKeyResult = Awaited<ReturnType<AuthApi["verifyApiKey"]>>;
type ApiKeyListItem = ListApiKeysResult["apiKeys"][number];
type VerifiedApiKey = NonNullable<
  Extract<VerifyApiKeyResult, { valid: boolean; error: null }>["key"]
>;

export type ApiIdentity = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
  key: VerifiedApiKey;
};

type ApiKeyVerificationError = {
  code?: string;
  details?: {
    tryAgainIn?: unknown;
  };
};

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
};

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function normalizePermissions(value: unknown): ApiKeyPermissionSet | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const permissions: ApiKeyPermissionSet = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!Array.isArray(entry)) {
      continue;
    }
    permissions[key] = entry.filter(
      (permission): permission is string => typeof permission === "string"
    );
  }

  return permissions;
}

export function normalizeApiKeyPermissions(value: unknown) {
  return normalizePermissions(value);
}

export function normalizeApiKeyRecord(key: ApiKeyListItem | VerifiedApiKey) {
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    start: key.start,
    enabled: key.enabled,
    permissions: normalizePermissions(key.permissions),
    createdAt: toIsoString(key.createdAt),
    updatedAt: toIsoString(key.updatedAt),
    expiresAt: toIsoString(key.expiresAt),
    lastRequest: toIsoString(key.lastRequest),
    rateLimit: {
      enabled: key.rateLimitEnabled,
      max: key.rateLimitMax,
      timeWindowMs: key.rateLimitTimeWindow,
      requestCount: key.requestCount,
    },
  };
}

export function getBearerApiKey(headers: Headers) {
  const authorization = headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, ...tokenParts] = authorization.trim().split(/\s+/);
  if (scheme.toLowerCase() !== "bearer" || tokenParts.length !== 1) {
    return null;
  }

  return tokenParts[0] || null;
}

export function normalizeApiKeyExpiryDays(value: unknown): ApiKeyExpiryDays {
  return apiKeyExpiryDayOptions.includes(value as ApiKeyExpiryDays)
    ? (value as ApiKeyExpiryDays)
    : 90;
}

export async function listApiKeysForSession(headers: Headers) {
  const auth = await getAuth();
  return auth.api.listApiKeys({
    headers,
    query: {
      limit: 100,
      offset: 0,
      sortBy: "createdAt",
      sortDirection: "desc",
    },
  });
}

export async function createApiKeyForSession(options: {
  headers: Headers;
  name: string;
  expiresInDays: ApiKeyExpiryDays;
}) {
  const auth = await getAuth();
  return auth.api.createApiKey({
    headers: options.headers,
    body: {
      name: options.name,
      expiresIn: options.expiresInDays * 24 * 60 * 60,
    },
  });
}

export async function getApiKeyForSession(options: {
  headers: Headers;
  keyId: string;
}) {
  const auth = await getAuth();
  return auth.api.getApiKey({
    headers: options.headers,
    query: { id: options.keyId },
  });
}

export async function deleteApiKeyForSession(options: {
  headers: Headers;
  keyId: string;
}) {
  const auth = await getAuth();
  return auth.api.deleteApiKey({
    headers: options.headers,
    body: {
      keyId: options.keyId,
    },
  });
}

function isRateLimitError(code: string) {
  return (
    code === "RATE_LIMITED" ||
    code === "RATE_LIMIT_EXCEEDED" ||
    code === "USAGE_EXCEEDED"
  );
}

function getRetryAfterSeconds(error: ApiKeyVerificationError | null) {
  const tryAgainIn = error?.details?.tryAgainIn;
  if (typeof tryAgainIn !== "number" || !Number.isFinite(tryAgainIn)) {
    return null;
  }

  return Math.max(1, Math.ceil(tryAgainIn / 1000));
}

async function getUserById(userId: string) {
  const db = await getDatabase();
  return db
    .prepare(
      `
        select id, email, name
        from users
        where id = ?
        limit 1
      `
    )
    .bind(userId)
    .first<UserRow>();
}

export async function getApiIdentityFromBearerKey(options: {
  headers: Headers;
  permissions?: ApiKeyPermissionSet;
}) {
  const key = getBearerApiKey(options.headers);
  if (!key) {
    return {
      ok: false as const,
      status: 401,
      code: "unauthorized",
      detail: "A valid API bearer key is required.",
    };
  }

  const auth = await getAuth();
  const verified = await auth.api.verifyApiKey({
    body: {
      key,
      permissions: options.permissions,
    },
  });

  if (!verified.valid || !verified.key) {
    const error = verified.error as ApiKeyVerificationError | null;
    const code = error?.code ?? "invalid_api_key";
    const rateLimited = isRateLimitError(code);
    return {
      ok: false as const,
      status: rateLimited ? 429 : 401,
      code: rateLimited ? "rate_limited" : "invalid_api_key",
      detail: rateLimited
        ? "Too many requests for this API key. Try again later."
        : "The API bearer key is invalid, expired, disabled, or lacks the required permission.",
      retryAfterSeconds: rateLimited ? getRetryAfterSeconds(error) : null,
    };
  }

  const user = await getUserById(verified.key.referenceId);
  if (!user) {
    return {
      ok: false as const,
      status: 401,
      code: "invalid_api_key",
      detail: "The API bearer key is not linked to a valid account.",
    };
  }

  return {
    ok: true as const,
    identity: {
      user,
      key: verified.key,
    } satisfies ApiIdentity,
  };
}

export function normalizeCreatedApiKey(key: CreateApiKeyResult) {
  return {
    ...normalizeApiKeyRecord(key),
    key: key.key,
  };
}

type AdminApiKeyRow = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: number;
  requestCount: number;
  remaining: number | null;
  lastRequest: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  rateLimitEnabled: number;
  rateLimitMax: number | null;
  rateLimitTimeWindow: number | null;
  permissions: string | null;
  referenceId: string;
  ownerName: string | null;
  ownerEmail: string | null;
};

export type AdminApiKey = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean;
  requestCount: number;
  remaining: number | null;
  lastRequest: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  rateLimitEnabled: boolean;
  rateLimitMax: number | null;
  rateLimitTimeWindowMs: number | null;
  permissions: ApiKeyPermissionSet | null;
  ownerUserId: string;
  ownerName: string | null;
  ownerEmail: string | null;
};

function mapAdminApiKeyRow(row: AdminApiKeyRow): AdminApiKey {
  return {
    id: row.id,
    name: row.name,
    start: row.start,
    prefix: row.prefix,
    enabled: row.enabled === 1,
    requestCount: Number(row.requestCount ?? 0),
    remaining: row.remaining === null ? null : Number(row.remaining),
    lastRequest: row.lastRequest,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    rateLimitEnabled: row.rateLimitEnabled === 1,
    rateLimitMax: row.rateLimitMax === null ? null : Number(row.rateLimitMax),
    rateLimitTimeWindowMs:
      row.rateLimitTimeWindow === null ? null : Number(row.rateLimitTimeWindow),
    permissions: normalizePermissions(
      row.permissions
        ? (() => {
            try {
              return JSON.parse(row.permissions) as unknown;
            } catch {
              return null;
            }
          })()
        : null
    ),
    ownerUserId: row.referenceId,
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
  };
}

export async function countActiveApiKeysForAdmin(): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `
        select count(*) as count
        from apikey
        where enabled = 1
          and (expiresAt is null or expiresAt > ?)
      `
    )
    .bind(now)
    .first<{ count: number }>();

  return Number(row?.count ?? 0);
}

export async function listApiKeysForAdmin(): Promise<AdminApiKey[]> {
  const db = await getDatabase();
  const result = await db
    .prepare(
      `
        select
          a.id,
          a.name,
          a.start,
          a.prefix,
          a.enabled,
          a.requestCount,
          a.remaining,
          a.lastRequest,
          a.expiresAt,
          a.createdAt,
          a.updatedAt,
          a.rateLimitEnabled,
          a.rateLimitMax,
          a.rateLimitTimeWindow,
          a.permissions,
          a.referenceId,
          u.name as ownerName,
          u.email as ownerEmail
        from apikey a
        left join users u on u.id = a.referenceId
        order by
          case when a.lastRequest is not null then 0 else 1 end,
          a.lastRequest desc,
          a.createdAt desc
      `
    )
    .all<AdminApiKeyRow>();

  return result.results.map(mapAdminApiKeyRow);
}
