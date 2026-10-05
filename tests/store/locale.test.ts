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

  it("persists and rehydrates the Spanish preference and cookie", async () => {
    const storage = createMemoryStorage();
    restoreStorage = installWindowStorage(storage);
    const { useLocaleStore } = await import("@/store/locale");

    useLocaleStore.getState().setLocale("es");
    expect(
      JSON.parse(storage.getItem("trackdraw.locale") ?? "null")
    ).toMatchObject({
      state: { locale: "es" },
    });
    expect(document.cookie).toContain("trackdraw-locale=es");

    vi.resetModules();
    document.cookie = "trackdraw-locale=; Max-Age=0; Path=/";
    const { useLocaleStore: reloadedStore } = await import("@/store/locale");
    await reloadedStore.persist.rehydrate();
    expect(reloadedStore.getState().locale).toBe("es");
    expect(document.cookie).toContain("trackdraw-locale=es");
  });
});
