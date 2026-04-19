import "server-only";

import { parseAccountRole, type AccountRole } from "@/lib/account-roles";
import { getDatabase } from "@/lib/server/db";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: AccountRole;
};

type SessionUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: string | null;
  expiresAt: string;
};

const SESSION_COOKIE_NAMES = [
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
];

function getAuthSecret() {
  return process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET ?? null;
}

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  const cookieMap = new Map<string, string>();

  for (const pair of cookieHeader.split("; ")) {
    const [name, ...valueParts] = pair.split("=");
    if (!name || valueParts.length === 0) {
      continue;
    }

    const rawValue = valueParts.join("=");

    try {
      cookieMap.set(name, decodeURIComponent(rawValue));
    } catch {
      cookieMap.set(name, rawValue);
    }
  }

  return cookieMap;
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

function decodeBase64Signature(signature: string) {
  const binaryString = atob(signature);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

async function verifySignedCookieValue(value: string, secret: string) {
  const signatureStart = value.lastIndexOf(".");
  if (signatureStart < 1) {
    return null;
  }

  const signedValue = value.slice(0, signatureStart);
  const signature = value.slice(signatureStart + 1);

  if (signature.length !== 44 || !signature.endsWith("=")) {
    return null;
  }

  try {
    const key = await importHmacKey(secret);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Signature(signature),
      new TextEncoder().encode(signedValue)
    );

    return isValid ? signedValue : null;
  } catch {
    return null;
  }
}

async function readSessionTokenFromHeaders(requestHeaders: Headers) {
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  const cookies = parseCookieHeader(requestHeaders.get("cookie"));

  for (const cookieName of SESSION_COOKIE_NAMES) {
    const cookieValue = cookies.get(cookieName);
    if (!cookieValue) {
      continue;
    }

    const token = await verifySignedCookieValue(cookieValue, secret);
    if (token) {
      return token;
    }
  }

  return null;
}

export async function getCurrentUserFromHeaders(
  requestHeaders: Headers
): Promise<CurrentUser | null> {
  const sessionToken = await readSessionTokenFromHeaders(requestHeaders);
  if (!sessionToken) {
    return null;
  }

  const database = await getDatabase();
  const row = await database
    .prepare(
      `
        select
          u.id,
          u.email,
          u.name,
          u.image,
          u.role,
          s.expiresAt
        from sessions s
        inner join users u on u.id = s.userId
        where s.token = ?
        limit 1
      `
    )
    .bind(sessionToken)
    .first<SessionUserRow>();

  if (!row) {
    return null;
  }

  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    role: parseAccountRole(row.role),
  };
}
