// @vitest-environment happy-dom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShareUrl } from "@/hooks/useShareUrl";
import { encodeDesign } from "@/lib/share";
import { createDefaultDesign } from "@/lib/track/design";
import { useEditor } from "@/store/editor";

const routeState = vi.hoisted(() => ({
  params: {} as { token?: string },
}));

vi.mock("next/navigation", () => ({
  useParams: () => routeState.params,
}));

describe("useShareUrl", () => {
  beforeEach(() => {
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
    routeState.params = {};
  });

  afterEach(() => {
    cleanup();
  });

  it("imports a valid share token into the editor store", () => {
    const sharedDesign = createDefaultDesign();
    sharedDesign.id = "shared-design";
    sharedDesign.title = "Shared race layout";
    routeState.params = { token: encodeDesign(sharedDesign) };

    renderHook(() => useShareUrl());

    expect(useEditor.getState().track.design).toMatchObject({
      id: "shared-design",
      title: "Shared race layout",
    });
  });

  it("ignores missing or invalid share tokens", () => {
    const originalDesign = useEditor.getState().track.design;
    routeState.params = { token: "not-a-design" };

    renderHook(() => useShareUrl());

    expect(useEditor.getState().track.design).toBe(originalDesign);
  });
});
