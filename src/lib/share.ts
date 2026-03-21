import LZString from "lz-string";
import { normalizeDesign, serializeDesign } from "@/lib/design";
import type { TrackDesign } from "./types";

const MAX_SAFE_TOKEN_LENGTH = 7500;

export function encodeDesign(design: TrackDesign): string {
  const json = JSON.stringify(serializeDesign(design));
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
  return `${base}/share?d=${token}`;
}

export function isShareSafe(design: TrackDesign): boolean {
  return encodeDesign(design).length <= MAX_SAFE_TOKEN_LENGTH;
}
