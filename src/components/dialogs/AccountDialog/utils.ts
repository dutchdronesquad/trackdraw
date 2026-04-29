export function getDisplayName(
  user: { email?: string | null; name?: string | null } | null | undefined
) {
  return user?.name?.trim() || "TrackDraw account";
}

export function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getPermissionLabel(
  permissions: Record<string, string[]> | null
) {
  if (!permissions) {
    return "Read access";
  }

  const labels = Object.entries(permissions).flatMap(([resource, actions]) =>
    actions.map((action) => `${resource}:${action}`)
  );

  return labels.length > 0 ? labels.join(", ") : "Read access";
}
