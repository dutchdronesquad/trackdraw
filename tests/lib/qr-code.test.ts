import { describe, expect, it } from "vitest";
import { createQrCode } from "@/lib/qr-code";

describe("createQrCode", () => {
  it("creates a deterministic matrix for a share URL", () => {
    const first = createQrCode("https://trackdraw.app/share/abc123");
    const second = createQrCode("https://trackdraw.app/share/abc123");

    expect(first).toEqual(second);
    expect(first.version).toBe(3);
    expect(first.size).toBe(29);
    expect(first.modules).toHaveLength(first.size);
    expect(first.modules.every((row) => row.length === first.size)).toBe(true);
  });

  it("draws finder patterns in the expected corners", () => {
    const qr = createQrCode("https://trackdraw.app/share/abc123");
    const lastFinderX = qr.size - 7;
    const lastFinderY = qr.size - 7;

    expect(qr.modules[0][0]).toBe(true);
    expect(qr.modules[0][6]).toBe(true);
    expect(qr.modules[6][0]).toBe(true);
    expect(qr.modules[6][6]).toBe(true);
    expect(qr.modules[3][3]).toBe(true);
    expect(qr.modules[0][lastFinderX]).toBe(true);
    expect(qr.modules[lastFinderY][0]).toBe(true);
  });

  it("chooses a larger version for longer URLs", () => {
    const shortUrl = createQrCode("https://trackdraw.app/share/abc123");
    const longUrl = createQrCode(
      "https://trackdraw.app/share/abcdefghijklmnopqrstuvwxyz0123456789"
    );

    expect(longUrl.version).toBeGreaterThan(shortUrl.version);
  });

  it("throws when the payload is too large for the Race Pack QR", () => {
    expect(() => createQrCode(`https://trackdraw.app/share/${"x".repeat(120)}`))
      .toThrowError("QR payload is too large");
  });
});
