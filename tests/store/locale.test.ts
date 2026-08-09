// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStorage, installWindowStorage } from "../helpers/storage";

let restoreStorage: (() => void) | null = null;

describe("locale store migration", () => {
  beforeEach(() => {
    vi.resetModules();
    document.cookie = "trackdraw-locale=; Max-Age=0; Path=/";
  });

  afterEach(() => {
    restoreStorage?.();
    restoreStorage = null;
    vi.restoreAllMocks();
  });

  it("migrates a persisted zh preference and cookie to zh-CN", async () => {
    restoreStorage = installWindowStorage(
      createMemoryStorage({
        "trackdraw.locale": JSON.stringify({
          state: { locale: "zh" },
          version: 0,
        }),
      })
    );

    const { useLocaleStore } = await import("@/store/locale");
    await useLocaleStore.persist.rehydrate();

    expect(useLocaleStore.getState().locale).toBe("zh-CN");
    expect(document.cookie).toContain("trackdraw-locale=zh-CN");
  });
});
