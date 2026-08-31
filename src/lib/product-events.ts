import type { ShapeKind } from "@/lib/types";

export const PRODUCT_METRICS_CONTRACT_VERSION = "1.1.0" as const;
export const productMetricsContractVersions = [
  "1.0.0",
  PRODUCT_METRICS_CONTRACT_VERSION,
] as const;

export type ProductMetricsContractVersion =
  (typeof productMetricsContractVersions)[number];

export const productEventNames = [
  "editor.session_started",
  "editor.3d_opened",
  "editor.element_placed",
  "editor.meaningful_edit_completed",
  "project.imported",
  "export.completed",
  "share.viewed",
  "share.created",
  "publication.gallery_published",
  "acquisition.session_attributed",
  "operation.failed",
  "export.failed",
] as const;

export type ProductEventName = (typeof productEventNames)[number];

export const productEventElementKinds = [
  "gate",
  "tower",
  "flag",
  "cone",
  "label",
  "polyline",
  "startfinish",
  "ladder",
  "divegate",
  "barrier",
] as const satisfies readonly ShapeKind[];

export const productEventEditTypes = [
  "place",
  "transform",
  "delete",
  "route",
  "layout",
  "settings",
  "import",
] as const;

export const productEventExportFormats = [
  "png",
  "svg",
  "json",
  "pdf",
  "webm",
  "race_pack",
  "velocidrone",
  "render_3d",
] as const;

export const productEventAcquisitionSources = [
  "direct",
  "search",
  "social",
  "community",
  "referral",
  "campaign",
  "internal",
  "unknown",
] as const;

export const productEventLandingSurfaces = [
  "home",
  "studio",
  "gallery",
  "share",
  "embed",
  "other",
] as const;

export const productEventOperations = [
  "editor_load",
  "import",
  "export",
  "share_create",
  "gallery_publish",
  "share_view",
  "project_save",
] as const;

export const productEventFailureCategories = [
  "validation",
  "authentication",
  "authorization",
  "conflict",
  "rate_limited",
  "network",
  "storage",
  "rendering",
  "unsupported",
  "unknown",
] as const;

export const productEventExportFailureReasons = [
  "asset_load_failed",
  "canvas_unavailable",
  "flight_path_failed",
  "font_load_failed",
  "invalid_design",
  "recording_failed",
  "rendering_failed",
  "serialization_failed",
  "track_path_missing",
  "unsupported_browser",
  "unknown",
] as const;

export type ProductEventEditType = (typeof productEventEditTypes)[number];
export type ProductEventExportFormat =
  (typeof productEventExportFormats)[number];
export type ProductEventOperation = (typeof productEventOperations)[number];
export type ProductEventFailureCategory =
  (typeof productEventFailureCategories)[number];
export type ProductEventExportFailureReason =
  (typeof productEventExportFailureReasons)[number];

export type ProductEventProperties =
  | Record<string, never>
  | { kind: ShapeKind; count: number }
  | { edit_type: ProductEventEditType }
  | { shape_count: number }
  | { format: ProductEventExportFormat }
  | { surface: "share" | "embed"; share_type?: "temporary" | "published" }
  | { share_type: "temporary" | "published" }
  | {
      source: (typeof productEventAcquisitionSources)[number];
      landing_surface: (typeof productEventLandingSurfaces)[number];
    }
  | {
      operation: ProductEventOperation;
      category: ProductEventFailureCategory;
      surface: "editor" | "share" | "embed" | "gallery";
    }
  | {
      format: ProductEventExportFormat;
      category: ProductEventFailureCategory;
      reason: ProductEventExportFailureReason;
      surface: "editor";
    };

export type ProductEventContext = {
  projectId?: string | null;
  shareToken?: string | null;
  properties?: ProductEventProperties;
};

type ProductEventPayload = ProductEventContext & {
  contractVersion: typeof PRODUCT_METRICS_CONTRACT_VERSION;
  event: ProductEventName;
  sessionId: string | null;
};

const SESSION_KEY = "trackdraw.productSessionId";
const AUTH_STATE_KEY = "trackdraw.productEvent.authState";
const DISABLED_KEY = "trackdraw.productAnalyticsDisabled";
const ONCE_KEY_PREFIX = "trackdraw.productEvent.";

function isProductAnalyticsDisabled() {
  try {
    return window.localStorage.getItem(DISABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function clearSessionTrackingState() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(ONCE_KEY_PREFIX))
        window.sessionStorage.removeItem(key);
    }
  } catch {
    // Tracking remains best effort when browser storage is unavailable.
  }
}

function getSessionId() {
  if (isProductAnalyticsDisabled()) return null;
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const sessionId = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, sessionId);
    return sessionId;
  } catch {
    return null;
  }
}

export function syncProductEventAuthState(isAuthenticated: boolean) {
  if (typeof window === "undefined") return;
  try {
    const nextState = isAuthenticated ? "authenticated" : "anonymous";
    const previousState = window.sessionStorage.getItem(AUTH_STATE_KEY);
    if (previousState && previousState !== nextState)
      clearSessionTrackingState();
    window.sessionStorage.setItem(AUTH_STATE_KEY, nextState);
  } catch {
    // Tracking remains best effort when browser storage is unavailable.
  }
}

export function setProductAnalyticsDisabled(disabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (disabled) {
      window.localStorage.setItem(DISABLED_KEY, "1");
      clearSessionTrackingState();
    } else {
      window.localStorage.removeItem(DISABLED_KEY);
    }
  } catch {
    // A signed-in server preference can still enforce the objection.
  }
}

export function getProductAnalyticsDisabled() {
  return typeof window !== "undefined" && isProductAnalyticsDisabled();
}

export function getProductEventSessionId() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function classifyProductOperationFailure(
  response?: Response | null,
  fallback: ProductEventFailureCategory = "unknown"
): ProductEventFailureCategory {
  if (!response) return fallback;
  if (response.status === 400 || response.status === 422) return "validation";
  if (response.status === 401) return "authentication";
  if (response.status === 403) return "authorization";
  if (response.status === 409) return "conflict";
  if (response.status === 429) return "rate_limited";
  return fallback;
}

export function classifyProductExportFailure(
  format: ProductEventExportFormat,
  error: unknown
): {
  category: ProductEventFailureCategory;
  reason: ProductEventExportFailureReason;
} {
  const message = error instanceof Error ? error.message : "";
  const errorName = error instanceof Error ? error.name : "";

  if (errorName === "NotSupportedError") {
    return { category: "unsupported", reason: "unsupported_browser" };
  }
  if (/No track path/i.test(message)) {
    return { category: "validation", reason: "track_path_missing" };
  }
  if (/Could not compute flight path/i.test(message)) {
    return { category: "rendering", reason: "flight_path_failed" };
  }
  if (/Velocidrone export (found|needs|could not resolve)/i.test(message)) {
    return { category: "validation", reason: "invalid_design" };
  }
  if (/Nothing to export/i.test(message)) {
    return { category: "validation", reason: "invalid_design" };
  }
  if (/CJK PDF font/i.test(message)) {
    return { category: "network", reason: "font_load_failed" };
  }
  if (/SVG load failed/i.test(message)) {
    return { category: "rendering", reason: "asset_load_failed" };
  }
  if (/No 2D context/i.test(message)) {
    return { category: "rendering", reason: "canvas_unavailable" };
  }

  if (format === "webm") {
    return { category: "rendering", reason: "recording_failed" };
  }
  if (format === "json") {
    return { category: "unknown", reason: "serialization_failed" };
  }
  if (format === "velocidrone") {
    return { category: "validation", reason: "invalid_design" };
  }
  if (
    format === "png" ||
    format === "svg" ||
    format === "pdf" ||
    format === "race_pack" ||
    format === "render_3d"
  ) {
    return { category: "rendering", reason: "rendering_failed" };
  }
  return { category: "unknown", reason: "unknown" };
}

export function trackProductEvent(
  event: ProductEventName,
  context: ProductEventContext = {},
  options?: { oncePerSession?: string }
) {
  if (
    typeof window === "undefined" ||
    process.env.NODE_ENV === "test" ||
    isProductAnalyticsDisabled()
  )
    return;

  const onceKey = options?.oncePerSession
    ? `${ONCE_KEY_PREFIX}${options.oncePerSession}`
    : null;
  if (onceKey) {
    try {
      if (window.sessionStorage.getItem(onceKey)) return;
      window.sessionStorage.setItem(onceKey, "1");
    } catch {
      // Tracking remains best effort when browser storage is unavailable.
    }
  }

  const payload: ProductEventPayload = {
    contractVersion: PRODUCT_METRICS_CONTRACT_VERSION,
    event,
    sessionId: getSessionId(),
    ...context,
  };
  void fetch("/api/product-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt a product workflow.
  });
}
