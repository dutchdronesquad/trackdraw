"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Sparkles,
  StarOff,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/AppTooltip";
import { dataTableSortButtonClassName } from "@/components/data-table/DataTableLayout";
import { getSiteMediaUrl } from "@/lib/seo";
import type { DashboardGalleryEntry, GalleryState } from "@/lib/server/gallery";
import { formatFieldSize as formatMeasurementFieldSize } from "@/lib/track/units";

export type GalleryUpdateAction = "feature" | "unfeature" | "hide" | "restore";
export type ShareLifecycleState = "active" | "expired" | "revoked";
export type Translate = (
  key: string,
  values?: Record<string, unknown>
) => string;

export function getOwnerLabel(entry: DashboardGalleryEntry) {
  return (
    entry.ownerName?.trim() || entry.ownerEmail?.trim() || entry.ownerUserId
  );
}

export function getTrackSecondaryLabel(entry: DashboardGalleryEntry) {
  const shareTitle = entry.shareTitle?.trim();
  if (
    shareTitle &&
    shareTitle.toLowerCase() !== entry.galleryTitle.trim().toLowerCase()
  ) {
    return shareTitle;
  }

  return entry.shareToken;
}

export function getStateVariant(
  state: GalleryState
): "default" | "muted" | "outline" {
  if (state === "featured") return "default";
  if (state === "hidden") return "muted";
  return "outline";
}

export function getStateLabel(
  state: GalleryState,
  t: Translate,
  tCommon: Translate
) {
  switch (state) {
    case "listed":
      return tCommon("status.listed");
    case "featured":
      return tCommon("status.featured");
    case "hidden":
      return tCommon("status.hidden");
    default:
      return t("stateValues.unlistedBadge");
  }
}

export function getShareLifecycleState(
  entry: DashboardGalleryEntry
): ShareLifecycleState {
  if (entry.shareRevokedAt) return "revoked";
  if (
    entry.shareExpiresAt &&
    new Date(entry.shareExpiresAt).getTime() <= Date.now()
  ) {
    return "expired";
  }

  return "active";
}

export function getShareLifecycleLabel(
  state: ShareLifecycleState,
  t: Translate
) {
  return t(`shareValues.${state}`);
}

export function getShareLifecycleVariant(
  state: ShareLifecycleState
): "default" | "muted" | "outline" {
  if (state === "active") return "outline";
  return "muted";
}

export function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function getShareLifecycleDetail(
  entry: DashboardGalleryEntry,
  t: Translate
) {
  const state = getShareLifecycleState(entry);
  if (state === "revoked")
    return t("lifecycle.revokedOn", { date: formatDate(entry.shareRevokedAt) });
  if (state === "expired")
    return t("lifecycle.expiredOn", { date: formatDate(entry.shareExpiresAt) });
  if (entry.shareExpiresAt)
    return t("lifecycle.expiresOn", { date: formatDate(entry.shareExpiresAt) });
  return t("lifecycle.noExpiry");
}

export function formatFieldSize(entry: DashboardGalleryEntry, t: Translate) {
  if (entry.fieldWidth == null || entry.fieldHeight == null) {
    return t("fallback.notSet");
  }

  return formatMeasurementFieldSize(
    entry.fieldWidth,
    entry.fieldHeight,
    "metric"
  );
}

export function formatElementCount(entry: DashboardGalleryEntry, t: Translate) {
  if (entry.shapeCount == null) return t("fallback.notAvailable");
  return t("meta.elementCount", { count: entry.shapeCount });
}

export function getPreviewImageUrl(entry: DashboardGalleryEntry) {
  if (!entry.galleryPreviewImage) return null;
  if (entry.galleryPreviewImage.startsWith("http")) {
    return entry.galleryPreviewImage;
  }

  return getSiteMediaUrl(entry.galleryPreviewImage);
}

export function getEmbedAvailable(entry: DashboardGalleryEntry) {
  return (
    entry.shareType === "published" &&
    getShareLifecycleState(entry) === "active"
  );
}

export function getEmbedUnavailableReason(
  entry: DashboardGalleryEntry,
  t: Translate
) {
  if (entry.shareType !== "published") return t("embed.unavailableTemporary");
  const state = getShareLifecycleState(entry);
  if (state === "revoked") return t("embed.unavailableRevoked");
  if (state === "expired") return t("embed.unavailableExpired");
  return null;
}

export function getInspectSummary(entry: DashboardGalleryEntry, t: Translate) {
  const shareState = getShareLifecycleState(entry);

  if (shareState === "revoked") {
    return {
      tone: "warning" as const,
      title: t("reviewState.revokedTitle"),
      detail: t("reviewState.revokedDetail"),
    };
  }

  if (shareState === "expired") {
    return {
      tone: "warning" as const,
      title: t("reviewState.expiredTitle"),
      detail: t("reviewState.expiredDetail"),
    };
  }

  if (entry.galleryState === "hidden") {
    return {
      tone: "info" as const,
      title: t("reviewState.hiddenTitle"),
      detail: t("reviewState.hiddenDetail"),
    };
  }

  if (!entry.galleryPreviewImage) {
    return {
      tone: "warning" as const,
      title: t("reviewState.missingPreviewTitle"),
      detail: t("reviewState.missingPreviewDetail"),
    };
  }

  return {
    tone: "ok" as const,
    title: t("reviewState.readyTitle"),
    detail: t("reviewState.readyDetail"),
  };
}

function ActionTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function getFeatureAction(entry: DashboardGalleryEntry, t: Translate) {
  return entry.galleryState !== "featured"
    ? {
        action: "feature" as const,
        label: t("actions.feature"),
        icon: Sparkles,
      }
    : {
        action: "unfeature" as const,
        label: t("actions.unfeature"),
        icon: StarOff,
      };
}

function getVisibilityAction(entry: DashboardGalleryEntry, t: Translate) {
  return entry.galleryState !== "hidden"
    ? {
        action: "hide" as const,
        label: t("actions.hide"),
        icon: EyeOff,
      }
    : {
        action: "restore" as const,
        label: t("actions.restore"),
        icon: Eye,
      };
}

type GetGalleryColumnsParams = {
  t: Translate;
  tCommon: Translate;
  pendingShareToken: string | null;
  canManageGallery: boolean;
  onUpdateEntry: (shareToken: string, action: GalleryUpdateAction) => void;
  onDeleteCandidate: (entry: DashboardGalleryEntry) => void;
};

export function getGalleryColumns({
  t,
  tCommon,
  pendingShareToken,
  canManageGallery,
  onUpdateEntry,
  onDeleteCandidate,
}: GetGalleryColumnsParams): ColumnDef<DashboardGalleryEntry>[] {
  return [
    {
      id: "track",
      accessorFn: (row) => row.galleryTitle,
      meta: { className: "w-[30%] min-w-56" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.track")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {row.original.galleryTitle}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {getTrackSecondaryLabel(row.original)}
          </p>
        </div>
      ),
    },
    {
      id: "owner",
      accessorFn: (row) => getOwnerLabel(row),
      header: tCommon("labels.owner"),
      meta: { className: "w-[22%] min-w-48" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{getOwnerLabel(row.original)}</p>
          <p className="text-muted-foreground truncate text-xs">
            {row.original.ownerEmail ?? row.original.ownerUserId}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "galleryState",
      filterFn: (row, columnId, filterValue: GalleryState[]) =>
        filterValue.length === 0 ||
        filterValue.includes(row.getValue<GalleryState>(columnId)),
      header: t("table.state"),
      meta: { className: "w-28" },
      cell: ({ row }) => (
        <Badge variant={getStateVariant(row.original.galleryState)}>
          {getStateLabel(row.original.galleryState, t, tCommon)}
        </Badge>
      ),
    },
    {
      id: "shareLifecycle",
      header: t("table.share"),
      accessorFn: (row) => getShareLifecycleState(row),
      filterFn: (row, columnId, filterValue: string[]) =>
        filterValue.length === 0 ||
        filterValue.includes(row.getValue<string>(columnId)),
      meta: { className: "w-56" },
      cell: ({ row }) => {
        const lifecycleState = getShareLifecycleState(row.original);

        return (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Badge
              variant={getShareLifecycleVariant(lifecycleState)}
              className="shrink-0"
            >
              {getShareLifecycleLabel(lifecycleState, t)}
            </Badge>
            <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
              {getShareLifecycleDetail(row.original, t)}
            </span>
          </div>
        );
      },
    },
    {
      id: "published",
      meta: { className: "w-36" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.published")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      accessorFn: (row) => row.galleryPublishedAt ?? row.updatedAt,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.galleryPublishedAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      meta: { className: "w-32 text-right" },
      cell: ({ row }) => {
        const entry = row.original;
        const isPending = pendingShareToken === entry.shareToken;
        const featureAction = getFeatureAction(entry, t);
        const FeatureIcon = featureAction.icon;
        const visibilityAction = getVisibilityAction(entry, t);
        const VisibilityIcon = visibilityAction.icon;

        return (
          <div
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hidden items-center justify-end gap-1 md:flex">
              <ActionTooltip label={featureAction.label}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hover:bg-muted hover:text-foreground size-7"
                  disabled={isPending || !canManageGallery}
                  aria-label={`${featureAction.label} ${entry.galleryTitle}`}
                  onClick={() =>
                    onUpdateEntry(entry.shareToken, featureAction.action)
                  }
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FeatureIcon className="size-4" />
                  )}
                </Button>
              </ActionTooltip>
              <ActionTooltip label={visibilityAction.label}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hover:bg-muted hover:text-foreground size-7"
                  disabled={isPending || !canManageGallery}
                  aria-label={`${visibilityAction.label} ${entry.galleryTitle}`}
                  onClick={() =>
                    onUpdateEntry(entry.shareToken, visibilityAction.action)
                  }
                >
                  <VisibilityIcon className="size-4" />
                </Button>
              </ActionTooltip>
              <ActionTooltip label={t("actions.delete")}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-muted hover:text-destructive size-7"
                  disabled={isPending || !canManageGallery}
                  aria-label={`${t("actions.delete")} ${entry.galleryTitle}`}
                  onClick={() => onDeleteCandidate(entry)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </ActionTooltip>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground ml-auto size-8 p-0 md:hidden"
                  disabled={isPending || !canManageGallery}
                  aria-label={t("actions.open")}
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="size-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem
                  onClick={() =>
                    onUpdateEntry(entry.shareToken, featureAction.action)
                  }
                >
                  <FeatureIcon className="size-4" />
                  {featureAction.label}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onUpdateEntry(entry.shareToken, visibilityAction.action)
                  }
                >
                  <VisibilityIcon className="size-4" />
                  {visibilityAction.label}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteCandidate(entry)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
