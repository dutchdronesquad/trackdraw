"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  ImageOff,
  Info,
  Link2,
  Loader2,
  MoreHorizontal,
  Sparkles,
  StarOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import DataTable from "@/components/data-table/DataTable";
import DataTableFacetFilter from "@/components/data-table/DataTableFacetFilter";
import { dataTableSortButtonClassName } from "@/components/data-table/DataTableLayout";
import DataTableToolbar from "@/components/data-table/DataTableToolbar";
import type { AccountRole } from "@/lib/account/roles";
import { getSiteMediaUrl } from "@/lib/seo";
import type {
  DashboardGalleryEntry,
  GalleryState,
  StoredGalleryEntry,
} from "@/lib/server/gallery";
import { formatFieldSize as formatMeasurementFieldSize } from "@/lib/track/units";

type DashboardGalleryManagerProps = {
  currentUserRole: AccountRole;
  initialEntries: DashboardGalleryEntry[];
};

type GalleryUpdateAction = "feature" | "unfeature" | "hide" | "restore";
type ShareLifecycleState = "active" | "expired" | "revoked";

const galleryManagerRoles: AccountRole[] = ["moderator", "admin"];
const stateFilterValues: GalleryState[] = [
  "listed",
  "featured",
  "hidden",
  "unlisted",
];
const shareFilterValues: ShareLifecycleState[] = [
  "active",
  "expired",
  "revoked",
];

type Translate = (key: string, values?: Record<string, unknown>) => string;

function getOwnerLabel(entry: DashboardGalleryEntry) {
  return (
    entry.ownerName?.trim() || entry.ownerEmail?.trim() || entry.ownerUserId
  );
}

function getTrackSecondaryLabel(entry: DashboardGalleryEntry) {
  const shareTitle = entry.shareTitle?.trim();
  if (
    shareTitle &&
    shareTitle.toLowerCase() !== entry.galleryTitle.trim().toLowerCase()
  ) {
    return shareTitle;
  }

  return entry.shareToken;
}

function getStateVariant(state: GalleryState): "default" | "muted" | "outline" {
  if (state === "featured") return "default";
  if (state === "hidden") return "muted";
  return "outline";
}

function getStateLabel(state: GalleryState, t: Translate) {
  switch (state) {
    case "listed":
      return t("stateValues.listed");
    case "featured":
      return t("stateValues.featured");
    case "hidden":
      return t("stateValues.hidden");
    default:
      return t("stateValues.unlistedBadge");
  }
}

function getShareLifecycleState(
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

function getShareLifecycleLabel(state: ShareLifecycleState, t: Translate) {
  return t(`shareValues.${state}`);
}

function getShareLifecycleVariant(
  state: ShareLifecycleState
): "default" | "muted" | "outline" {
  if (state === "active") return "outline";
  return "muted";
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

function getShareLifecycleDetail(entry: DashboardGalleryEntry, t: Translate) {
  const state = getShareLifecycleState(entry);
  if (state === "revoked")
    return t("revokedOn", { date: formatDate(entry.shareRevokedAt) });
  if (state === "expired")
    return t("expiredOn", { date: formatDate(entry.shareExpiresAt) });
  if (entry.shareExpiresAt)
    return t("expiresOn", { date: formatDate(entry.shareExpiresAt) });
  return t("noExpiry");
}

function formatFieldSize(entry: DashboardGalleryEntry, t: Translate) {
  if (entry.fieldWidth == null || entry.fieldHeight == null) {
    return t("notSet");
  }

  return formatMeasurementFieldSize(
    entry.fieldWidth,
    entry.fieldHeight,
    "metric"
  );
}

function formatElementCount(entry: DashboardGalleryEntry, t: Translate) {
  if (entry.shapeCount == null) return t("notAvailable");
  return t("elementCount", { count: entry.shapeCount });
}

function getPreviewImageUrl(entry: DashboardGalleryEntry) {
  if (!entry.galleryPreviewImage) return null;
  if (entry.galleryPreviewImage.startsWith("http")) {
    return entry.galleryPreviewImage;
  }

  return getSiteMediaUrl(entry.galleryPreviewImage);
}

function getEmbedAvailable(entry: DashboardGalleryEntry) {
  return (
    entry.shareType === "published" &&
    getShareLifecycleState(entry) === "active"
  );
}

function getEmbedUnavailableReason(entry: DashboardGalleryEntry, t: Translate) {
  if (entry.shareType !== "published") return t("embedUnavailableTemporary");
  const state = getShareLifecycleState(entry);
  if (state === "revoked") return t("embedUnavailableRevoked");
  if (state === "expired") return t("embedUnavailableExpired");
  return null;
}

function getInspectSummary(entry: DashboardGalleryEntry, t: Translate) {
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

function InspectDetail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 py-1.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-sm wrap-break-word">{value}</dd>
    </div>
  );
}

function InspectMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

function InspectNotice({
  tone,
  title,
  detail,
}: {
  tone: "ok" | "warning" | "info";
  title: string;
  detail: string;
}) {
  const Icon =
    tone === "ok" ? CheckCircle2 : tone === "warning" ? AlertCircle : Info;
  const iconClassName =
    tone === "ok"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <div className="flex gap-3 py-3">
      <span
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-5">{detail}</p>
      </div>
    </div>
  );
}

function InspectSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-muted-foreground text-xs font-medium uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function DashboardGalleryManager({
  currentUserRole,
  initialEntries,
}: DashboardGalleryManagerProps) {
  const t = useTranslations("dashboard.gallery");
  const [entries, setEntries] = useState(initialEntries);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pendingShareToken, setPendingShareToken] = useState<string | null>(
    null
  );
  const [selectedGalleryStates, setSelectedGalleryStates] = useState<
    GalleryState[]
  >(["listed", "featured", "hidden"]);
  const [selectedShareLifecycles, setSelectedShareLifecycles] = useState<
    ShareLifecycleState[]
  >([]);
  const [inspectCandidate, setInspectCandidate] =
    useState<DashboardGalleryEntry | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<DashboardGalleryEntry | null>(null);

  const canManageGallery = galleryManagerRoles.includes(currentUserRole);

  const updateEntry = async (
    shareToken: string,
    action: GalleryUpdateAction
  ) => {
    if (!canManageGallery) {
      toast.error(t("manageRestricted"));
      return;
    }

    setPendingShareToken(shareToken);

    try {
      const response = await fetch(
        `/api/dashboard/gallery/${encodeURIComponent(shareToken)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      const payload = (await response.json()) as
        | { ok: true; entry: StoredGalleryEntry }
        | { ok: false; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? t("updateFailed") : (payload.error ?? t("updateFailed"))
        );
      }

      setEntries((previous) =>
        previous.map((entry) =>
          entry.shareToken === payload.entry.shareToken
            ? { ...entry, ...payload.entry }
            : entry
        )
      );

      toast.success(t("updateSuccess", { action }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateFailed"));
    } finally {
      setPendingShareToken(null);
    }
  };

  const deleteEntry = async (shareToken: string) => {
    if (!canManageGallery) {
      toast.error(t("deleteRestricted"));
      return;
    }

    setPendingShareToken(shareToken);

    try {
      const response = await fetch(
        `/api/dashboard/gallery/${encodeURIComponent(shareToken)}`,
        {
          method: "DELETE",
        }
      );

      const payload = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok ? t("deleteFailed") : (payload.error ?? t("deleteFailed"))
        );
      }

      setEntries((previous) =>
        previous.filter((entry) => entry.shareToken !== shareToken)
      );
      setDeleteCandidate(null);
      toast.success(t("deleteSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("deleteFailed"));
    } finally {
      setPendingShareToken(null);
    }
  };

  const copyShareLink = async (entry: DashboardGalleryEntry) => {
    const href = `${window.location.origin}/share/${entry.shareToken}`;

    try {
      await navigator.clipboard.writeText(href);
      toast.success(t("copyLinkSuccess"));
    } catch {
      toast.error(t("copyLinkFailed"));
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("copySuccess", { label }));
    } catch {
      toast.error(t("copyFailed", { label }));
    }
  };

  function getFeatureAction(entry: DashboardGalleryEntry) {
    return entry.galleryState !== "featured"
      ? {
          action: "feature" as const,
          label: t("feature"),
          icon: Sparkles,
        }
      : {
          action: "unfeature" as const,
          label: t("unfeature"),
          icon: StarOff,
        };
  }

  function getVisibilityAction(entry: DashboardGalleryEntry) {
    return entry.galleryState !== "hidden"
      ? {
          action: "hide" as const,
          label: t("hide"),
          icon: EyeOff,
        }
      : {
          action: "restore" as const,
          label: t("restore"),
          icon: Eye,
        };
  }

  const columns: ColumnDef<DashboardGalleryEntry>[] = [
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
      header: t("table.owner"),
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
      header: t("table.state"),
      meta: { className: "w-28" },
      cell: ({ row }) => (
        <Badge variant={getStateVariant(row.original.galleryState)}>
          {getStateLabel(row.original.galleryState, t as unknown as Translate)}
        </Badge>
      ),
    },
    {
      id: "shareLifecycle",
      header: t("table.share"),
      accessorFn: (row) => getShareLifecycleState(row),
      meta: { className: "w-44" },
      cell: ({ row }) => {
        const lifecycleState = getShareLifecycleState(row.original);

        return (
          <div className="min-w-0">
            <Badge variant={getShareLifecycleVariant(lifecycleState)}>
              {getShareLifecycleLabel(
                lifecycleState,
                t as unknown as Translate
              )}
            </Badge>
            <p className="text-muted-foreground mt-1 truncate text-xs">
              {getShareLifecycleDetail(row.original, t as unknown as Translate)}
            </p>
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
        const featureAction = getFeatureAction(entry);
        const FeatureIcon = featureAction.icon;
        const visibilityAction = getVisibilityAction(entry);
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
                    void updateEntry(entry.shareToken, featureAction.action)
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
                    void updateEntry(entry.shareToken, visibilityAction.action)
                  }
                >
                  <VisibilityIcon className="size-4" />
                </Button>
              </ActionTooltip>
              <ActionTooltip label={t("delete")}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-muted hover:text-destructive size-7"
                  disabled={isPending || !canManageGallery}
                  aria-label={`${t("delete")} ${entry.galleryTitle}`}
                  onClick={() => setDeleteCandidate(entry)}
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
                  aria-label={t("openActions")}
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
                    void updateEntry(entry.shareToken, featureAction.action)
                  }
                >
                  <FeatureIcon className="size-4" />
                  {featureAction.label}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    void updateEntry(entry.shareToken, visibilityAction.action)
                  }
                >
                  <VisibilityIcon className="size-4" />
                  {visibilityAction.label}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteCandidate(entry)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" />
                  {t("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: entries,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const entry = row.original;
      const q = filterValue.toLowerCase();
      return (
        entry.galleryTitle.toLowerCase().includes(q) ||
        entry.galleryDescription.toLowerCase().includes(q) ||
        getOwnerLabel(entry).toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rowsForCurrentSearch = table.getRowModel().rows;
  const stateFilteredRows = rowsForCurrentSearch.filter((row) =>
    selectedGalleryStates.length === 0
      ? true
      : selectedGalleryStates.includes(row.original.galleryState)
  );
  const filteredRows = stateFilteredRows.filter((row) =>
    selectedShareLifecycles.length === 0
      ? true
      : selectedShareLifecycles.includes(getShareLifecycleState(row.original))
  );
  const stateFacetRows = rowsForCurrentSearch.filter((row) =>
    selectedShareLifecycles.length === 0
      ? true
      : selectedShareLifecycles.includes(getShareLifecycleState(row.original))
  );
  const shareFacetRows = rowsForCurrentSearch.filter((row) =>
    selectedGalleryStates.length === 0
      ? true
      : selectedGalleryStates.includes(row.original.galleryState)
  );
  const stateFilterOptions = stateFilterValues.map((value) => ({
    value,
    label: t(`stateValues.${value}`),
    count: stateFacetRows.filter((row) => row.original.galleryState === value)
      .length,
  }));
  const shareFilterOptions = shareFilterValues.map((value) => ({
    value,
    label: t(`shareValues.${value}`),
    count: shareFacetRows.filter(
      (row) => getShareLifecycleState(row.original) === value
    ).length,
  }));
  const expiredShareCount = entries.filter(
    (entry) => getShareLifecycleState(entry) === "expired"
  ).length;
  const revokedShareCount = entries.filter(
    (entry) => getShareLifecycleState(entry) === "revoked"
  ).length;
  const emptyMessage =
    entries.length === 0 ? t("emptyMessage") : t("emptyFilteredMessage");
  const inspectShareLifecycle = inspectCandidate
    ? getShareLifecycleState(inspectCandidate)
    : null;
  const inspectPreviewImageUrl = inspectCandidate
    ? getPreviewImageUrl(inspectCandidate)
    : null;
  const inspectSummary = inspectCandidate
    ? getInspectSummary(inspectCandidate, t as unknown as Translate)
    : null;

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={t("searchPlaceholder")}
      >
        <DataTableFacetFilter
          title={t("state")}
          selected={selectedGalleryStates}
          options={stateFilterOptions}
          onChange={setSelectedGalleryStates}
        />
        <DataTableFacetFilter
          title={t("share")}
          selected={selectedShareLifecycles}
          options={shareFilterOptions}
          onChange={setSelectedShareLifecycles}
        />
      </DataTableToolbar>

      <p className="text-muted-foreground text-xs">
        {t("cleanupNotice", {
          expired: expiredShareCount,
          revoked: revokedShareCount,
        })}
      </p>

      <DataTable
        table={table}
        rows={filteredRows}
        columnsLength={columns.length}
        emptyMessage={emptyMessage}
        minWidthClassName="min-w-[920px]"
        emptyClassName="py-8"
        onRowClick={(row) => setInspectCandidate(row.original)}
        getRowAriaLabel={(row) =>
          t("rowAriaLabel", { title: row.original.galleryTitle })
        }
      />

      <p className="text-muted-foreground text-xs">
        {t("showing", { filtered: filteredRows.length, total: entries.length })}
      </p>

      <Dialog
        open={inspectCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setInspectCandidate(null);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden p-0 sm:max-w-4xl">
          {inspectCandidate && inspectShareLifecycle && inspectSummary ? (
            <div className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col">
              <DialogHeader className="border-b p-6 pr-12">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <DialogTitle className="truncate">
                      {inspectCandidate.galleryTitle}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {t("inspect.title")}
                    </DialogDescription>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Badge
                      variant={getStateVariant(inspectCandidate.galleryState)}
                    >
                      {getStateLabel(
                        inspectCandidate.galleryState,
                        t as unknown as Translate
                      )}
                    </Badge>
                    <Badge
                      variant={getShareLifecycleVariant(inspectShareLifecycle)}
                    >
                      {getShareLifecycleLabel(
                        inspectShareLifecycle,
                        t as unknown as Translate
                      )}
                    </Badge>
                    <Badge
                      variant={inspectPreviewImageUrl ? "outline" : "muted"}
                    >
                      {inspectPreviewImageUrl
                        ? t("inspect.previewReady")
                        : t("inspect.previewMissing")}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="min-h-0 overflow-y-auto">
                <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
                  <div className="border-b p-6 lg:border-r lg:border-b-0">
                    <div className="bg-muted relative aspect-video overflow-hidden rounded-md border">
                      {inspectPreviewImageUrl ? (
                        <Image
                          src={inspectPreviewImageUrl}
                          alt={inspectCandidate.galleryTitle}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <ImageOff className="size-8 opacity-50" />
                          <p className="text-sm font-medium">
                            {t("inspect.noPreviewMedia")}
                          </p>
                        </div>
                      )}
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
                      <InspectMetric
                        label={t("inspect.field")}
                        value={formatFieldSize(
                          inspectCandidate,
                          t as unknown as Translate
                        )}
                      />
                      <InspectMetric
                        label={t("inspect.elements")}
                        value={formatElementCount(
                          inspectCandidate,
                          t as unknown as Translate
                        )}
                      />
                      <InspectMetric
                        label={t("inspect.published")}
                        value={formatDate(inspectCandidate.galleryPublishedAt)}
                      />
                      <InspectMetric
                        label={t("inspect.updated")}
                        value={formatDate(inspectCandidate.updatedAt)}
                      />
                    </dl>
                  </div>

                  <div className="space-y-7 p-6">
                    <InspectSection title={t("inspect.reviewOutcome")}>
                      <InspectNotice
                        tone={inspectSummary.tone}
                        title={inspectSummary.title}
                        detail={inspectSummary.detail}
                      />
                    </InspectSection>

                    <InspectSection title={t("inspect.publicListing")}>
                      <dl className="space-y-1">
                        <InspectDetail
                          label={t("inspect.description")}
                          value={
                            <span className="leading-6">
                              {inspectCandidate.galleryDescription ||
                                t("inspect.noDescription")}
                            </span>
                          }
                        />
                        <InspectDetail
                          label={t("inspect.shareTitle")}
                          value={
                            inspectCandidate.shareTitle ||
                            t("inspect.untitledTrack")
                          }
                        />
                      </dl>
                    </InspectSection>

                    <InspectSection title={t("inspect.shareLifecycle")}>
                      <dl className="space-y-1">
                        <InspectDetail
                          label={t("inspect.type")}
                          value={
                            <Badge
                              variant={
                                inspectCandidate.shareType === "published"
                                  ? "outline"
                                  : "muted"
                              }
                            >
                              {inspectCandidate.shareType === "published"
                                ? t("inspect.published_")
                                : t("inspect.temporary")}
                            </Badge>
                          }
                        />
                        <InspectDetail
                          label={t("inspect.embed")}
                          value={
                            getEmbedAvailable(inspectCandidate) ? (
                              <Link
                                href={`/embed/${inspectCandidate.shareToken}`}
                                className="flex items-center gap-1 text-sm hover:underline"
                              >
                                <Link2 className="size-3.5 shrink-0" />
                                {t("inspect.available")}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                {getEmbedUnavailableReason(
                                  inspectCandidate,
                                  t as unknown as Translate
                                ) ?? t("notAvailable")}
                              </span>
                            )
                          }
                        />
                        {inspectCandidate.projectId ? (
                          <InspectDetail
                            label={t("inspect.projectId")}
                            value={
                              <span className="flex items-center gap-1.5">
                                <span className="truncate font-mono text-xs">
                                  {inspectCandidate.projectId}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-5 shrink-0"
                                  aria-label={t("inspect.copyProjectId")}
                                  onClick={() =>
                                    void copyToClipboard(
                                      inspectCandidate.projectId!,
                                      t("inspect.projectId")
                                    )
                                  }
                                >
                                  <Copy className="size-3" />
                                </Button>
                              </span>
                            }
                          />
                        ) : null}
                        <InspectDetail
                          label={t("inspect.shareCreated")}
                          value={formatDate(inspectCandidate.shareCreatedAt)}
                        />
                        <InspectDetail
                          label={t("inspect.entryUpdated")}
                          value={formatDate(inspectCandidate.updatedAt)}
                        />
                        {inspectCandidate.shareExpiresAt ? (
                          <InspectDetail
                            label={t("inspect.expires")}
                            value={formatDate(inspectCandidate.shareExpiresAt)}
                          />
                        ) : null}
                        {inspectCandidate.shareRevokedAt ? (
                          <InspectDetail
                            label={t("inspect.revoked")}
                            value={formatDate(inspectCandidate.shareRevokedAt)}
                          />
                        ) : null}
                      </dl>
                    </InspectSection>

                    <InspectSection title={t("inspect.record")}>
                      <dl className="space-y-1">
                        <InspectDetail
                          label={t("inspect.owner")}
                          value={getOwnerLabel(inspectCandidate)}
                        />
                        <InspectDetail
                          label={t("inspect.ownerEmail")}
                          value={
                            inspectCandidate.ownerEmail ??
                            inspectCandidate.ownerUserId
                          }
                        />
                        <InspectDetail
                          label={t("inspect.ownerId")}
                          value={
                            <span className="flex items-center gap-1.5">
                              <span className="truncate font-mono text-xs">
                                {inspectCandidate.ownerUserId}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-5 shrink-0"
                                aria-label={t("inspect.copyOwnerId")}
                                onClick={() =>
                                  void copyToClipboard(
                                    inspectCandidate.ownerUserId,
                                    t("inspect.ownerId")
                                  )
                                }
                              >
                                <Copy className="size-3" />
                              </Button>
                            </span>
                          }
                        />
                        <InspectDetail
                          label={t("inspect.shareToken")}
                          value={
                            <span className="font-mono text-xs">
                              {inspectCandidate.shareToken}
                            </span>
                          }
                        />
                        {inspectCandidate.galleryPreviewImage ? (
                          <InspectDetail
                            label={t("inspect.previewFile")}
                            value={
                              <span className="font-mono text-xs">
                                {inspectCandidate.galleryPreviewImage}
                              </span>
                            }
                          />
                        ) : null}
                      </dl>
                    </InspectSection>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t p-6 pt-4 sm:justify-between">
                <DialogClose asChild>
                  <Button variant="outline">{t("inspect.close")}</Button>
                </DialogClose>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copyShareLink(inspectCandidate)}
                  >
                    <Copy className="size-4" />
                    {t("inspect.copyLink")}
                  </Button>
                  <Button asChild>
                    <Link href={`/share/${inspectCandidate.shareToken}`}>
                      <ExternalLink className="size-4" />
                      {t("inspect.openShare")}
                    </Link>
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : (
            <DialogHeader className="p-6 pr-12">
              <DialogTitle>{t("inspect.emptyTitle")}</DialogTitle>
              <DialogDescription>
                {t("inspect.emptyDescription")}
              </DialogDescription>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("deleteDialog.description", {
                title:
                  deleteCandidate?.galleryTitle ??
                  t("deleteDialog.fallbackTitle"),
                strong: (chunks) => (
                  <span className="text-foreground font-medium">{chunks}</span>
                ),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="text-muted-foreground space-y-2 text-sm">
            <p>
              {t("deleteDialog.owner")}{" "}
              <span className="text-foreground">
                {deleteCandidate
                  ? getOwnerLabel(deleteCandidate)
                  : t("deleteDialog.unknownOwner")}
              </span>
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("deleteDialog.cancel")}</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={
                !deleteCandidate ||
                pendingShareToken === deleteCandidate.shareToken ||
                !canManageGallery
              }
              onClick={() => {
                if (!deleteCandidate) return;
                void deleteEntry(deleteCandidate.shareToken);
              }}
            >
              {deleteCandidate &&
              pendingShareToken === deleteCandidate.shareToken ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("deleteDialog.deleting")}
                </>
              ) : (
                t("deleteDialog.deleteEntry")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
