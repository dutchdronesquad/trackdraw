// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useTheme } from "@/hooks/useTheme";

describe("useTheme", () => {
  afterEach(() => {
    cleanup();
    document.documentElement.className = "";
  });

  it("reads the current document theme and tracks class changes", async () => {
    document.documentElement.classList.add("dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe("dark");

    await act(async () => {
      document.documentElement.classList.remove("dark");
    });

    expect(result.current).toBe("light");
  });
});
