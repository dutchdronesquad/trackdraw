type MessageTree = Record<string, unknown>;

function isMessageTree(value: unknown): value is MessageTree {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function mergeMessagesWithFallback(
  fallback: unknown,
  translation: unknown
): unknown {
  if (typeof fallback === "string") {
    return typeof translation === "string" && translation.trim().length > 0
      ? translation
      : fallback;
  }

  if (Array.isArray(fallback)) {
    const translatedItems = Array.isArray(translation) ? translation : [];
    return fallback.map((fallbackValue, index) =>
      mergeMessagesWithFallback(fallbackValue, translatedItems[index])
    );
  }

  if (!isMessageTree(fallback)) return fallback;

  const translatedTree = isMessageTree(translation) ? translation : {};
  return Object.fromEntries(
    Object.entries(fallback).map(([key, fallbackValue]) => [
      key,
      mergeMessagesWithFallback(fallbackValue, translatedTree[key]),
    ])
  );
}
