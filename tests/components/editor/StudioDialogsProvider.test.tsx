// @vitest-environment happy-dom

import { useSyncExternalStore, type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  StudioDialogsProvider,
  useStudioDialog,
  useStudioDialogs,
} from "@/components/editor/StudioDialogsProvider";
import { useEditorDialogs } from "@/components/editor/useEditorDialogs";

// Model Next's native History API integration without mocking the dialog state.
vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(
      useSyncExternalStore(
        (notify) => {
          window.addEventListener("popstate", notify);
          return () => window.removeEventListener("popstate", notify);
        },
        () => window.location.search,
        () => ""
      )
    ),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <StudioDialogsProvider>{children}</StudioDialogsProvider>
);
function navigate(url: string) {
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

beforeEach(() => {
  window.history.replaceState(null, "", "/studio");
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method].bind(window.history);
    vi.spyOn(window.history, method).mockImplementation((...args) => {
      original(...args);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  }
});
afterEach(cleanup);

describe("studio dialog navigation", () => {
  it.each([false, true])(
    "restores every editor dialog on desktop/mobile (%s)",
    (isMobile) => {
      const { result } = renderHook(
        () => useEditorDialogs({ isMobile, setMobileToolsOpen: vi.fn() }),
        { wrapper }
      );
      const targets = [
        ["share", "shareOpen"],
        ["export", "exportOpen"],
        ["import", "importOpen"],
        ["shortcuts", "shortcutsOpen"],
        ["new-project", "newProjectOpen"],
        ["projects", "projectManagerOpen"],
        ["presets", "presetPickerOpen"],
        ["commands", "commandPaletteOpen"],
      ] as const;
      for (const [target, property] of targets) {
        act(() => navigate(`/studio?dialog=${target}`));
        expect(result.current[property]).toBe(true);
        expect(
          Object.values(result.current).filter((value) => value === true)
        ).toHaveLength(1);
      }
      act(() => navigate("/studio?dialog=unsupported"));
      expect(Object.values(result.current).includes(true)).toBe(false);
    }
  );

  it("opens one dialog, replaces switches, and ignores stale close events", () => {
    const { result } = renderHook(
      () => ({
        account: useStudioDialog("account"),
        feedback: useStudioDialog("feedback"),
      }),
      { wrapper }
    );
    act(() => result.current.account[1](true));
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    expect(result.current.account[0]).toBe(true);
    act(() => result.current.feedback[1](true));
    act(() => result.current.account[1](false));
    expect(result.current.account[0]).toBe(false);
    expect(result.current.feedback[0]).toBe(true);
    act(() => result.current.feedback[1](false));
    expect(window.location.search).toBe("");
  });

  it("restores account section on refresh and reacts to back/forward snapshots", () => {
    navigate("/studio?view=3d&dialog=account&section=api-keys#canvas");
    const first = renderHook(useStudioDialogs, { wrapper });
    expect(first.result.current?.accountView).toBe("apiKeys");
    first.unmount();
    const { result } = renderHook(useStudioDialogs, { wrapper });
    expect(result.current?.dialog).toBe("account");
    expect(result.current?.accountView).toBe("apiKeys");
    act(() => navigate("/studio?view=3d#canvas"));
    expect(result.current?.dialog).toBeNull();
    act(() =>
      navigate("/studio?view=3d&dialog=account&section=api-keys#canvas")
    );
    expect(result.current?.accountView).toBe("apiKeys");
    act(() => result.current?.setAccountView("privacy"));
    expect(window.location.search).toContain("section=privacy");
    act(() => result.current?.setDialog("account", false));
    expect(window.location.href).toContain("/studio?view=3d#canvas");
  });
});
