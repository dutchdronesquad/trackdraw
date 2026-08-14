// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";
import {
  getProductAnalyticsDisabled,
  getProductEventSessionId,
  setProductAnalyticsDisabled,
  syncProductEventAuthState,
} from "@/lib/product-events";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

describe("product event browser identity", () => {
  it("rotates the anonymous session and dedupe state when auth changes", () => {
    window.sessionStorage.setItem(
      "trackdraw.productSessionId",
      "anonymous-session"
    );
    window.sessionStorage.setItem(
      "trackdraw.productEvent.editor-session:project-1",
      "1"
    );

    syncProductEventAuthState(false);
    syncProductEventAuthState(true);

    expect(getProductEventSessionId()).toBeNull();
    expect(
      window.sessionStorage.getItem(
        "trackdraw.productEvent.editor-session:project-1"
      )
    ).toBeNull();
  });

  it("keeps an opt-out persistent while clearing session identifiers", () => {
    window.sessionStorage.setItem("trackdraw.productSessionId", "session-1");

    setProductAnalyticsDisabled(true);

    expect(getProductAnalyticsDisabled()).toBe(true);
    expect(getProductEventSessionId()).toBeNull();

    setProductAnalyticsDisabled(false);
    expect(getProductAnalyticsDisabled()).toBe(false);
  });
});
