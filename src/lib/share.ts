import LZString from "lz-string";
import { normalizeDesign, serializeDesignForShare } from "@/lib/track/design";
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
  const json = JSON.stringify(serializeDesignForShare(design));
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
  const path = buildStoredSharePath(token, view);
  if (typeof window === "undefined") {
    return path;
  }

  const base = `${window.location.protocol}//${window.location.host}`;
  const url = new URL(path, `${base}/`);
  if (view) {
    url.searchParams.set("view", view);
  }
  return url.toString();
}

export function buildStoredSharePath(token: string, view?: EditorView) {
  const path = `/share/${encodeURIComponent(token)}`;
  if (!view) return path;
  return `${path}?view=${view}`;
}

export function buildStoredEmbedPath(token: string, view?: EditorView) {
  const path = `/embed/${encodeURIComponent(token)}`;
  if (!view) return path;
  return `${path}?view=${view}`;
}

export function isShareSafe(design: TrackDesign): boolean {
  return encodeDesign(design).length <= MAX_SAFE_TOKEN_LENGTH;
}

export type ShareDecodeError = "too-large" | "invalid";

/**
 * Like decodeDesign, but distinguishes between a token that is too long for
 * browsers/apps to pass intact ("too-large") and one that is simply corrupt or
 * miscopied ("invalid"). The heuristic is: if the token itself exceeds
 * MAX_SAFE_TOKEN_LENGTH the decode failure is most likely due to truncation.
 */
export function decodeDesignWithReason(
  token: string
): { ok: true; design: TrackDesign } | { ok: false; reason: ShareDecodeError } {
  const normalized = normalizeShareToken(token);
  const design = decodeDesign(token);
  if (design) return { ok: true, design };
  const reason: ShareDecodeError =
    normalized.length > MAX_SAFE_TOKEN_LENGTH ? "too-large" : "invalid";
  return { ok: false, reason };
}

export function getShareTitle(design: TrackDesign) {
  return design.title.trim() || "Untitled track";
}

export function getShareDescription(design: TrackDesign) {
  const customDescription = design.description?.trim();
  if (customDescription) return customDescription;

  return `Read-only TrackDraw plan for ${getShareTitle(design)}.`;
}
