"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Ban,
  ExternalLink,
  Link2,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/AppTooltip";
import { dataTableSortButtonClassName } from "@/components/data-table/DataTableLayout";
import type { GalleryState } from "@/lib/server/gallery";
import type { DashboardShare } from "@/lib/server/shares";

export type ShareLifecycleState = "active" | "expired" | "revoked";
export type Translate = (
  key: string,
  values?: Record<string, unknown>
) => string;

const SHARE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const SHARE_CLEANUP_UTC_HOUR = 3;
const SHARE_CLEANUP_UTC_MINUTE = 17;

export function getOwnerLabel(share: DashboardShare, t: Translate) {
  if (!share.ownerUserId) return t("owner.anonymous");
  return (
    share.ownerName?.trim() || share.ownerEmail?.trim() || share.ownerUserId
  );
}

export function getLifecycleState(share: DashboardShare): ShareLifecycleState {
  if (share.revokedAt) return "revoked";
  if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
    return "expired";
  }
  return "active";
}

function getLifecycleVariant(
  state: ShareLifecycleState
): "default" | "muted" | "outline" {
  if (state === "active") return "outline";
  return "muted";
}

function getGalleryStateVariant(
  state: GalleryState
): "default" | "muted" | "outline" {
  if (state === "featured") return "default";
  if (state === "hidden") return "muted";
  return "outline";
}

function getGalleryStateLabel(
  state: GalleryState,
  t: Translate,
  tCommon: Translate
) {
  if (state === "unlisted") return t("galleryValues.unlisted");
  return tCommon(`status.${state}`);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCleanupDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(value);
}

function getExpectedCleanupDate(share: DashboardShare) {
  const anchor = share.revokedAt
    ? share.revokedAt
    : share.shareType === "temporary"
      ? share.expiresAt
      : null;
  if (!anchor) return null;

  const anchorTime = new Date(anchor).getTime();
  if (!Number.isFinite(anchorTime)) return null;

  const eligibleAt = anchorTime + SHARE_RETENTION_MS;
  const cleanupAt = new Date(eligibleAt);
  cleanupAt.setUTCHours(SHARE_CLEANUP_UTC_HOUR, SHARE_CLEANUP_UTC_MINUTE, 0, 0);

  if (cleanupAt.getTime() < eligibleAt) {
    cleanupAt.setUTCDate(cleanupAt.getUTCDate() + 1);
  }

  return formatCleanupDate(cleanupAt);
}

function getLifecycleDetail(share: DashboardShare, t: Translate) {
  const state = getLifecycleState(share);
  if (state === "revoked") {
    return t("lifecycle.revokedOn", { date: formatDate(share.revokedAt) });
  }
  if (state === "expired") {
    return t("lifecycle.expiredOn", { date: formatDate(share.expiresAt) });
  }
  if (share.expiresAt) {
    return t("lifecycle.expiresOn", { date: formatDate(share.expiresAt) });
  }
  return t("lifecycle.noExpiry");
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

type GetSharesColumnsParams = {
  t: Translate;
  tCommon: Translate;
  pendingToken: string | null;
  canManageShares: boolean;
  canPurgeShares: boolean;
  onCopyLink: (token: string) => void;
  onRevokeCandidate: (share: DashboardShare) => void;
  onPurgeCandidate: (share: DashboardShare) => void;
};

export function getSharesColumns({
  t,
  tCommon,
  pendingToken,
  canManageShares,
  canPurgeShares,
  onCopyLink,
  onRevokeCandidate,
  onPurgeCandidate,
}: GetSharesColumnsParams): ColumnDef<DashboardShare>[] {
  return [
    {
      id: "track",
      accessorFn: (row) => row.title,
      meta: { className: "w-[28%] min-w-56" },
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
          <p className="truncate text-sm font-medium">{row.original.title}</p>
        </div>
      ),
    },
    {
      id: "owner",
      accessorFn: (row) => getOwnerLabel(row, t),
      filterFn: (row, _columnId, filterValue: string[]) =>
        filterValue.length === 0 ||
        filterValue.includes(
          row.original.ownerUserId ? "account" : "anonymous"
        ),
      header: tCommon("labels.owner"),
      meta: { className: "w-[20%] min-w-44" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{getOwnerLabel(row.original, t)}</p>
          {row.original.ownerEmail ? (
            <p className="text-muted-foreground truncate text-xs">
              {row.original.ownerEmail}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "type",
      accessorFn: (row) => row.shareType,
      filterFn: (row, columnId, filterValue: string[]) =>
        filterValue.length === 0 ||
        filterValue.includes(row.getValue<string>(columnId)),
      header: t("table.type"),
      meta: { className: "w-28" },
      cell: ({ row }) => (
        <Badge
          variant={row.original.shareType === "published" ? "outline" : "muted"}
        >
          {t(`typeValues.${row.original.shareType}`)}
        </Badge>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => getLifecycleState(row),
      filterFn: (row, columnId, filterValue: string[]) =>
        filterValue.length === 0 ||
        filterValue.includes(row.getValue<string>(columnId)),
      header: t("table.status"),
      meta: { className: "w-64 min-w-64" },
      cell: ({ row }) => {
        const state = getLifecycleState(row.original);
        const lifecycleLabel = t(`statusValues.${state}`);
        const expectedCleanupDate = getExpectedCleanupDate(row.original);
        const expectedCleanupLabel = expectedCleanupDate
          ? t("lifecycle.expectedCleanup", { date: expectedCleanupDate })
          : null;
        const accessibleLifecycleLabel = expectedCleanupLabel
          ? t("lifecycle.statusWithCleanup", {
              status: lifecycleLabel,
              cleanup: expectedCleanupLabel,
            })
          : lifecycleLabel;
        return (
          <div className="flex min-w-0 items-center gap-2">
            {expectedCleanupLabel ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={getLifecycleVariant(state)}
                    tabIndex={0}
                    aria-label={accessibleLifecycleLabel}
                    className="focus-visible:ring-ring/40 shrink-0 cursor-help rounded-md outline-none focus-visible:ring-2"
                  >
                    {lifecycleLabel}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  {expectedCleanupLabel}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Badge variant={getLifecycleVariant(state)} className="shrink-0">
                {lifecycleLabel}
              </Badge>
            )}
            <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
              {getLifecycleDetail(row.original, t)}
            </span>
          </div>
        );
      },
    },
    {
      id: "gallery",
      accessorFn: (row) => row.galleryState ?? "none",
      header: t("table.gallery"),
      meta: { className: "w-32" },
      cell: ({ row }) =>
        row.original.galleryState ? (
          <Badge variant={getGalleryStateVariant(row.original.galleryState)}>
            {getGalleryStateLabel(row.original.galleryState, t, tCommon)}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">
            {t("table.notInGallery")}
          </span>
        ),
    },
    {
      id: "created",
      meta: { className: "w-32" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.created")}
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      accessorFn: (row) => row.createdAt,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      meta: { className: "w-32 text-right" },
      cell: ({ row }) => {
        const share = row.original;
        const isPending = pendingToken === share.token;
        const isRevoked = getLifecycleState(share) === "revoked";

        return (
          <div
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hidden items-center justify-end gap-1 md:flex">
              {isRevoked ? null : (
                <>
                  <ActionTooltip label={t("actions.copyLink")}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="hover:bg-muted hover:text-foreground size-7"
                      aria-label={`${t("actions.copyLink")} ${share.title}`}
                      onClick={() => onCopyLink(share.token)}
                    >
                      <Link2 className="size-4" />
                    </Button>
                  </ActionTooltip>
                  <ActionTooltip label={t("actions.open")}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="hover:bg-muted hover:text-foreground size-7"
                      asChild
                    >
                      <Link
                        href={`/share/${share.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${t("actions.open")} ${share.title}`}
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                    </Button>
                  </ActionTooltip>
                </>
              )}
              {isRevoked ? null : (
                <ActionTooltip label={t("actions.revoke")}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-muted hover:text-destructive size-7"
                    disabled={isPending || !canManageShares}
                    aria-label={`${t("actions.revoke")} ${share.title}`}
                    onClick={() => onRevokeCandidate(share)}
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Ban className="size-4" />
                    )}
                  </Button>
                </ActionTooltip>
              )}
              {isRevoked ? (
                <ActionTooltip label={t("actions.purge")}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-muted hover:text-destructive size-7"
                    disabled={isPending || !canPurgeShares}
                    aria-label={`${t("actions.purge")} ${share.title}`}
                    onClick={() => onPurgeCandidate(share)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </ActionTooltip>
              ) : null}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground ml-auto size-8 p-0 md:hidden"
                  aria-label={t("actions.openMenu")}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                {isRevoked ? null : (
                  <>
                    <DropdownMenuItem onClick={() => onCopyLink(share.token)}>
                      <Link2 className="size-4" />
                      {t("actions.copyLink")}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/share/${share.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-4" />
                        {t("actions.open")}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {isRevoked ? null : (
                  <DropdownMenuItem
                    disabled={!canManageShares}
                    onClick={() => onRevokeCandidate(share)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="size-4" />
                    {t("actions.revoke")}
                  </DropdownMenuItem>
                )}
                {isRevoked ? (
                  <DropdownMenuItem
                    disabled={!canPurgeShares}
                    onClick={() => onPurgeCandidate(share)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    {t("actions.purge")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
