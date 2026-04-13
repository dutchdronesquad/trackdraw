// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  clamp,
  isTypingInInput,
  mergeClientRects,
  normalizeRect,
  rectsIntersect,
} from "@/lib/canvas/shared";

describe("canvas shared helpers", () => {
  it("detects typing targets and contenteditable ancestors", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const editable = document.createElement("div");
    editable.contentEditable = "true";
    const child = document.createElement("span");
    editable.append(child);
    const plain = document.createElement("button");

    expect(isTypingInInput(input)).toBe(true);
    expect(isTypingInInput(textarea)).toBe(true);
    expect(isTypingInInput(editable)).toBe(true);
    expect(isTypingInInput(child)).toBe(true);
    expect(isTypingInInput(plain)).toBe(false);
    expect(isTypingInInput(null)).toBe(false);
  });

  it("clamps values into the provided range", () => {
    expect(clamp(-4, 0, 10)).toBe(0);
    expect(clamp(7, 0, 10)).toBe(7);
    expect(clamp(14, 0, 10)).toBe(10);
  });

  it("normalizes rects drawn in any direction", () => {
    expect(normalizeRect({ x: 10, y: 20 }, { x: 4, y: 8 })).toEqual({
      x: 4,
      y: 8,
      width: 6,
      height: 12,
    });
    expect(normalizeRect({ x: 1, y: 2 }, { x: 5, y: 8 })).toEqual({
      x: 1,
      y: 2,
      width: 4,
      height: 6,
    });
  });

  it("checks rect intersection and merges multiple bounds", () => {
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 5, width: 3, height: 3 }
      )
    ).toBe(true);
    expect(
      rectsIntersect(
        { x: 0, y: 0, width: 2, height: 2 },
        { x: 3, y: 3, width: 2, height: 2 }
      )
    ).toBe(false);

    expect(
      mergeClientRects([
        { x: 4, y: 5, width: 6, height: 3 },
        { x: 1, y: 2, width: 2, height: 4 },
        { x: 8, y: 1, width: 5, height: 10 },
      ])
    ).toEqual({
      x: 1,
      y: 1,
      width: 12,
      height: 10,
    });
    expect(mergeClientRects([])).toBeNull();
  });
});
