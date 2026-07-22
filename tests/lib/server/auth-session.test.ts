import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createD1Statement, installD1Statements } from "../../helpers/d1";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
}));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({
    prepare: mocks.prepare,
  })),
}));

import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";

async function signedSessionCookie(token: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(token)
  );

  return `better-auth.session_token=${encodeURIComponent(
    `${token}.${Buffer.from(signature).toString("base64")}`
  )}`;
}

describe("auth session resolver", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mocks.prepare.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("returns null without an auth secret or session cookie", async () => {
    await expect(getCurrentUserFromHeaders(new Headers())).resolves.toBeNull();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it("rejects tampered signed session cookies before querying the database", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret");

    const user = await getCurrentUserFromHeaders(
      new Headers({
        cookie: "better-auth.session_token=session-token.invalid-signature",
      })
    );

    expect(user).toBeNull();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it("loads a valid unexpired session and normalizes the account role", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));
    const statement = createD1Statement({
      first: {
        id: "user-1",
        email: "pilot@example.com",
        name: "Race Director",
        image: "https://example.com/avatar.jpg",
        role: "invalid-role",
        expiresAt: "2026-06-09T13:00:00.000Z",
      },
    });
    installD1Statements(mocks.prepare, [statement]);

    const user = await getCurrentUserFromHeaders(
      new Headers({
        cookie: await signedSessionCookie("session-token", "test-secret"),
      })
    );

    expect(statement.bind).toHaveBeenCalledWith("session-token");
    expect(user).toEqual({
      id: "user-1",
      email: "pilot@example.com",
      name: "Race Director",
      image: "https://example.com/avatar.jpg",
      role: "user",
    });
  });

  it("loads a session when cookie pairs have no whitespace separator", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));
    const statement = createD1Statement({
      first: {
        id: "user-1",
        email: "pilot@example.com",
        name: "Race Director",
        image: null,
        role: "admin",
        expiresAt: "2026-06-09T13:00:00.000Z",
        bannedAt: null,
      },
    });
    installD1Statements(mocks.prepare, [statement]);
    const sessionCookie = await signedSessionCookie(
      "session-token",
      "test-secret"
    );

    const user = await getCurrentUserFromHeaders(
      new Headers({
        cookie: `theme=dark;${sessionCookie}`,
      })
    );

    expect(statement.bind).toHaveBeenCalledWith("session-token");
    expect(user?.id).toBe("user-1");
  });

  it("rejects banned users after loading the session row", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));
    installD1Statements(mocks.prepare, [
      createD1Statement({
        first: {
          id: "user-1",
          email: "pilot@example.com",
          name: null,
          image: null,
          role: "user",
          expiresAt: "2026-06-09T13:00:00.000Z",
          bannedAt: "2026-06-01T00:00:00.000Z",
        },
      }),
    ]);

    await expect(
      getCurrentUserFromHeaders(
        new Headers({
          cookie: await signedSessionCookie("session-token", "test-secret"),
        })
      )
    ).resolves.toBeNull();
  });

  it("rejects expired sessions after loading the session row", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T12:00:00.000Z"));
    installD1Statements(mocks.prepare, [
      createD1Statement({
        first: {
          id: "user-1",
          email: "pilot@example.com",
          name: null,
          image: null,
          role: "admin",
          expiresAt: "2026-06-09T11:59:59.000Z",
        },
      }),
    ]);

    await expect(
      getCurrentUserFromHeaders(
        new Headers({
          cookie: await signedSessionCookie("session-token", "test-secret"),
        })
      )
    ).resolves.toBeNull();
  });
});
