import { describe, expect, it } from "vitest";
import { getEarlyWorkerResponse } from "@/lib/server/request-guards";

describe("getEarlyWorkerResponse", () => {
  it("blocks unsupported server action POSTs before they reach Next", async () => {
    const response = getEarlyWorkerResponse(
      new Request("https://trackdraw.app/studio", {
        method: "POST",
        headers: {
          "next-action": "0000000000000000000000000000000000000",
        },
      })
    );

    expect(response?.status).toBe(404);
    expect(await response?.text()).toBe("Not found");
  });

  it("blocks regular POSTs to the client-only studio page", () => {
    const response = getEarlyWorkerResponse(
      new Request("https://trackdraw.app/studio", { method: "POST" })
    );

    expect(response?.status).toBe(405);
    expect(response?.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
  });

  it("blocks unsafe methods to non-API page routes", () => {
    const response = getEarlyWorkerResponse(
      new Request("https://trackdraw.app/share/example-token", {
        method: "PUT",
      })
    );

    expect(response?.status).toBe(405);
  });

  it("does not block normal studio page requests", () => {
    const response = getEarlyWorkerResponse(
      new Request("https://trackdraw.app/studio", { method: "GET" })
    );

    expect(response).toBeNull();
  });

  it("does not block page OPTIONS requests", () => {
    const response = getEarlyWorkerResponse(
      new Request("https://trackdraw.app/studio", { method: "OPTIONS" })
    );

    expect(response).toBeNull();
  });

  it("does not block API POST requests", () => {
    const response = getEarlyWorkerResponse(
      new Request("https://trackdraw.app/api/shares", {
        method: "POST",
        headers: {
          "next-action": "0000000000000000000000000000000000000",
        },
      })
    );

    expect(response).toBeNull();
  });
});
