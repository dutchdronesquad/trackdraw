import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { sendPlunkMail } from "@/lib/server/plunk";

const fetchMock = vi.fn();
const mail = {
  to: { address: "pilot@example.test" },
  subject: "Service notice",
  htmlBody: "<p>Notice</p>",
  textBody: "Notice",
  emailType: "account-retention" as const,
  idempotencyKey: "account-retention-test",
};
beforeEach(() => {
  vi.stubEnv("PLUNK_API_KEY", "test-secret");
  vi.stubEnv("PLUNK_FROM_EMAIL", "sender@example.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Plunk transactional sender", () => {
  it("uses a stable idempotency header and preserves existing marketing subscription state", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    await sendPlunkMail(mail);
    const request = fetchMock.mock.calls[0][1];
    expect(request.headers["Idempotency-Key"]).toBe(mail.idempotencyKey);
    const body = JSON.parse(request.body);
    expect(body).not.toHaveProperty("subscribed");
    expect(body.headers["X-TrackDraw-Email-Type"]).toBe("account-retention");
    expect(request.signal).toBeInstanceOf(AbortSignal);
  });
  it("retains auth email behavior without an idempotency header", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const { emailType: _type, idempotencyKey: _key, ...authMail } = mail;
    await sendPlunkMail(authMail);
    const request = fetchMock.mock.calls[0][1];
    expect(request.headers).not.toHaveProperty("Idempotency-Key");
    expect(JSON.parse(request.body).headers["X-TrackDraw-Email-Type"]).toBe(
      "auth-magic-link"
    );
  });
  it("accepts a duplicate key only when the original matching request succeeded", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "IDEMPOTENCY_KEY_REUSED",
            details: { key: mail.idempotencyKey, originalStatusCode: 200 },
          },
        }),
        { status: 409 }
      )
    );
    await expect(sendPlunkMail(mail)).resolves.toBeUndefined();
  });
  it.each([
    {
      error: {
        code: "IDEMPOTENCY_KEY_REUSED",
        details: { key: mail.idempotencyKey, originalStatusCode: 500 },
      },
    },
    {
      error: {
        code: "IDEMPOTENCY_KEY_REUSED",
        details: { key: "other-key", originalStatusCode: 200 },
      },
    },
    {
      error: {
        code: "OTHER",
        details: { key: mail.idempotencyKey, originalStatusCode: 200 },
      },
    },
    { error: null },
    null,
    "invalid json",
  ])(
    "does not mistake a failed or unrecognized duplicate response for a send: %j",
    async (body) => {
      fetchMock.mockResolvedValueOnce(
        new Response(typeof body === "string" ? body : JSON.stringify(body), {
          status: 409,
        })
      );
      await expect(sendPlunkMail(mail)).rejects.toThrow("Plunk send failed");
    }
  );
});
