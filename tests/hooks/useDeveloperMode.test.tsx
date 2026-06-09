// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  useDeveloperMode,
  useDeveloperModeShortcut,
} from "@/hooks/useDeveloperMode";
import { createMemoryStorage, installWindowStorage } from "../helpers/storage";

let restoreStorage: (() => void) | null = null;

describe("useDeveloperMode", () => {
  beforeEach(() => {
    restoreStorage = installWindowStorage(createMemoryStorage());
  });

  afterEach(() => {
    cleanup();
    restoreStorage?.();
    restoreStorage = null;
  });

  it("persists explicit developer mode changes", () => {
    const { result } = renderHook(() => useDeveloperMode());

    act(() => {
      result.current.setEnabled(true);
    });

    expect(result.current.enabled).toBe(true);
    expect(localStorage.getItem("trackdraw:developer-mode")).toBe("1");

    act(() => {
      result.current.setEnabled(false);
    });

    expect(result.current.enabled).toBe(false);
    expect(localStorage.getItem("trackdraw:developer-mode")).toBeNull();
  });

  it("toggles with the developer shortcut outside text inputs", () => {
    renderHook(() => useDeveloperModeShortcut());
    const mode = renderHook(() => useDeveloperMode());

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: ".",
          metaKey: true,
          shiftKey: true,
        })
      );
    });

    expect(mode.result.current.enabled).toBe(true);

    const input = document.createElement("input");
    document.body.appendChild(input);
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: ".",
          metaKey: true,
          shiftKey: true,
          bubbles: true,
        })
      );
    });

    expect(mode.result.current.enabled).toBe(true);
    input.remove();
  });
});
