import LZString from "lz-string";
import { normalizeDesign, serializeDesign } from "@/lib/design";
import type { TrackDesign } from "./types";
import type { EditorView } from "./view";

const MAX_SAFE_TOKEN_LENGTH = 7500;

function normalizeShareToken(token: string): string {
  const trimmedToken = token.trim();
  try {
    return decodeURIComponent(trimmedToken);
  } catch {
    return trimmedToken;
  }
}

export function encodeDesign(design: TrackDesign): string {
  const json = JSON.stringify(serializeDesign(design));
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeDesign(token: string): TrackDesign | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(
      normalizeShareToken(token)
    );
    if (!json) return null;
    const raw = JSON.parse(json) as TrackDesign;
    return normalizeDesign(raw);
  } catch {
    return null;
  }
}

export function buildShareUrl(design: TrackDesign, view?: EditorView): string {
  const token = encodeDesign(design);
  const path = `/share/${encodeURIComponent(token)}`;
  if (typeof window === "undefined") {
    return view ? `${path}?view=${view}` : path;
  }

  const base = `${window.location.protocol}//${window.location.host}`;
  const url = new URL(path, `${base}/`);
  if (view) {
    url.searchParams.set("view", view);
  }
  return url.toString();
}

export function isShareSafe(design: TrackDesign): boolean {
  return encodeDesign(design).length <= MAX_SAFE_TOKEN_LENGTH;
}

export function getShareTitle(design: TrackDesign) {
  return design.title.trim() || "Untitled track";
}

export function getShareDescription(design: TrackDesign) {
  const customDescription = design.description?.trim();
  if (customDescription) return customDescription;

  return `Read-only TrackDraw plan for ${getShareTitle(design)}.`;
}
