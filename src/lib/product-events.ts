export const productEventNames = [
  "editor.session_started",
  "editor.3d_opened",
  "editor.element_placed",
  "project.imported",
  "export.completed",
  "share.viewed",
] as const;

export type ProductEventName = (typeof productEventNames)[number];

export type ProductEventMetadata = Record<string, string | number | boolean>;

type ProductEventPayload = {
  event: ProductEventName;
  sessionId: string | null;
  projectId?: string | null;
  shareToken?: string | null;
  metadata?: ProductEventMetadata;
};

const SESSION_KEY = "trackdraw.productSessionId";
const ONCE_KEY_PREFIX = "trackdraw.productEvent.";

function getSessionId() {
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

export function trackProductEvent(
  event: ProductEventName,
  context: Omit<ProductEventPayload, "event" | "sessionId"> = {},
  options?: { oncePerSession?: string }
) {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") return;

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
    // Analytics must never interrupt an editor, export, or public viewer flow.
  });
}
