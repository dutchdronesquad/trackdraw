"use client";

import type { Vector2d } from "konva/lib/types";
import type { Shape } from "@/lib/types";

export interface DraftPoint {
  x: number;
  y: number;
  z?: number;
}

export interface CursorState {
  rawMeters: { x: number; y: number };
  snappedMeters: { x: number; y: number };
  rawPx: { x: number; y: number };
  snappedPx: { x: number; y: number };
}

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_MARQUEE_SIZE = 8;

export const isTypingInInput = (target: HTMLElement | null) => {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    target.isContentEditable ||
    target.closest("[contenteditable=true]") !== null
  );
};

export const clipboard: Shape[] = [];

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const normalizeRect = (origin: Vector2d, next: Vector2d): RectLike => {
  const width = next.x - origin.x;
  const height = next.y - origin.y;
  return {
    x: width < 0 ? next.x : origin.x,
    y: height < 0 ? next.y : origin.y,
    width: Math.abs(width),
    height: Math.abs(height),
  };
};

export const rectsIntersect = (a: RectLike, b: RectLike) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

export const mergeClientRects = (rects: RectLike[]): RectLike | null => {
  if (!rects.length) return null;

  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].width;
  let maxY = rects[0].y + rects[0].height;

  for (let index = 1; index < rects.length; index++) {
    minX = Math.min(minX, rects[index].x);
    minY = Math.min(minY, rects[index].y);
    maxX = Math.max(maxX, rects[index].x + rects[index].width);
    maxY = Math.max(maxY, rects[index].y + rects[index].height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};
