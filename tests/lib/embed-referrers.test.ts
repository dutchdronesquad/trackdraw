import { describe, expect, it } from "vitest";
import {
  getEmbedReferrerHostname,
  normalizeEmbedReferrerHostname,
} from "@/lib/embed-referrers";

describe("embed referrer privacy boundary", () => {
  it("reduces a referring URL to a lowercase hostname", () => {
    expect(
      getEmbedReferrerHostname(
        "https://Events.Example.org/race?pilot=secret#schedule",
        "trackdraw.app"
      )
    ).toBe("events.example.org");
  });

  it.each([
    ["https://trackdraw.app/embed/token", "trackdraw.app"],
    ["https://dev.trackdraw.app/embed/token", "trackdraw.app"],
    ["http://localhost:3000/event", "trackdraw.app"],
    ["http://192.168.1.2/event", "trackdraw.app"],
    ["notaurl", "trackdraw.app"],
  ])(
    "rejects private, first-party, and invalid referrers",
    (referrer, host) => {
      expect(getEmbedReferrerHostname(referrer, host)).toBeNull();
    }
  );

  it("rejects hostnames that could expose an IP address or local system", () => {
    expect(normalizeEmbedReferrerHostname("10.0.0.1")).toBeNull();
    expect(normalizeEmbedReferrerHostname("event-server")).toBeNull();
    expect(normalizeEmbedReferrerHostname("[2001:db8::1]")).toBeNull();
  });
});
