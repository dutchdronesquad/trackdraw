import LZString from "lz-string";
import type { TrackDesign, Shape, PolylineShape } from "./types";

const MAX_SAFE_TOKEN_LENGTH = 7500;

function normalizeDesign(raw: TrackDesign): TrackDesign {
  return {
    ...raw,
    version: 1 as const,
    shapes: raw.shapes.map((shape) => {
      if (shape.kind === "polyline") {
        return { ...shape, smooth: (shape as PolylineShape).smooth ?? true } as Shape;
      }
      return shape;
    }),
  };
}

export function encodeDesign(design: TrackDesign): string {
  const json = JSON.stringify(design);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeDesign(token: string): TrackDesign | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(token);
    if (!json) return null;
    const raw = JSON.parse(json) as TrackDesign;
    return normalizeDesign(raw);
  } catch {
    return null;
  }
}

export function buildShareUrl(design: TrackDesign): string {
  const token = encodeDesign(design);
  const base =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";
  return `${base}/share/${token}`;
}

export function isShareSafe(design: TrackDesign): boolean {
  return encodeDesign(design).length <= MAX_SAFE_TOKEN_LENGTH;
}
