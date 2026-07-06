import { describe, expect, it } from "vitest";
import {
  computeReorderBeforeId,
  getListableTrackItems,
} from "@/components/inspector/views/list-panel";
import type { Shape } from "@/lib/types";

function fakeShape(id: string, kind: Shape["kind"] = "gate"): Shape {
  return { id, kind } as unknown as Shape;
}

describe("computeReorderBeforeId", () => {
  it("returns the id of the item now immediately after the dragged item", () => {
    const order = [fakeShape("a"), fakeShape("b"), fakeShape("c")];
    expect(computeReorderBeforeId(order, "a")).toBe("b");
  });

  it("returns null when the dragged item is now last", () => {
    const order = [fakeShape("b"), fakeShape("c"), fakeShape("a")];
    expect(computeReorderBeforeId(order, "a")).toBeNull();
  });

  it("keeps track items before trailing race lines when the dragged item is last in the visible list", () => {
    const route = fakeShape("route-1", "polyline");
    const gate = fakeShape("gate-1");
    const flag = fakeShape("flag-1", "flag");

    expect(
      computeReorderBeforeId([flag, gate], "gate-1", [gate, flag, route])
    ).toBe("route-1");
  });

  it("returns null when the dragged item isn't found", () => {
    const order = [fakeShape("a"), fakeShape("b")];
    expect(computeReorderBeforeId(order, "missing")).toBeNull();
  });

  it("returns the same next id when the order is unchanged", () => {
    const order = [fakeShape("a"), fakeShape("b"), fakeShape("c")];
    expect(computeReorderBeforeId(order, "b")).toBe("c");
  });
});

describe("getListableTrackItems", () => {
  it("excludes race lines from the track item list", () => {
    const gate = { id: "gate-1", kind: "gate" } as Shape;
    const route = { id: "route-1", kind: "polyline" } as Shape;
    const flag = { id: "flag-1", kind: "flag" } as Shape;

    expect(getListableTrackItems([gate, route, flag])).toEqual([gate, flag]);
  });
});
