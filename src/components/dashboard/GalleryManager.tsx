"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
const stateFilters: { value: GalleryState; label: string }[] = [
  { value: "listed", label: "Listed" },
  { value: "featured", label: "Featured" },
  { value: "hidden", label: "Hidden" },
  { value: "unlisted", label: "Unlisted (regular shares)" },
];
const shareFilters: { value: ShareLifecycleState; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "revoked", label: "Revoked" },
];

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

function getStateLabel(state: GalleryState) {
  switch (state) {
    case "listed":
      return "Listed";
    case "featured":
      return "Featured";
    case "hidden":
      return "Hidden";
    default:
      return "Unlisted";
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

function getShareLifecycleLabel(state: ShareLifecycleState) {
  switch (state) {
    case "active":
      return "Active";
    case "expired":
      return "Expired";
    case "revoked":
      return "Revoked";
  }
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

function getShareLifecycleDetail(entry: DashboardGalleryEntry) {
  const state = getShareLifecycleState(entry);
  if (state === "revoked") return `Revoked ${formatDate(entry.shareRevokedAt)}`;
  if (state === "expired") return `Expired ${formatDate(entry.shareExpiresAt)}`;
  if (entry.shareExpiresAt)
    return `Expires ${formatDate(entry.shareExpiresAt)}`;
  return "No expiry";
}

function formatFieldSize(entry: DashboardGalleryEntry) {
  if (entry.fieldWidth == null || entry.fieldHeight == null) {
    return "Not set";
  }

  return formatMeasurementFieldSize(
    entry.fieldWidth,
    entry.fieldHeight,
    "metric"
  );
}

function formatElementCount(entry: DashboardGalleryEntry) {
  if (entry.shapeCount == null) return "Not available";
  return `${entry.shapeCount} ${entry.shapeCount === 1 ? "element" : "elements"}`;
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

function getEmbedUnavailableReason(entry: DashboardGalleryEntry) {
  if (entry.shareType !== "published")
    return "Temporary shares cannot be embedded";
  const state = getShareLifecycleState(entry);
  if (state === "revoked") return "Share has been revoked";
  if (state === "expired") return "Share has expired";
  return null;
}

function getInspectSummary(entry: DashboardGalleryEntry) {
  const shareState = getShareLifecycleState(entry);

  if (shareState === "revoked") {
    return {
      tone: "warning" as const,
      title: "Share is revoked",
      detail:
        "The listing can still appear in dashboard cleanup views, but the public share page will not render active track data.",
    };
  }

  if (shareState === "expired") {
    return {
      tone: "warning" as const,
      title: "Share is expired",
      detail:
        "The public share page will no longer render active track data until the owner republishes or updates the share.",
    };
  }

  if (entry.galleryState === "hidden") {
    return {
      tone: "info" as const,
      title: "Hidden from public gallery",
      detail:
        "The share is active, but this listing is currently removed from public gallery discovery.",
    };
  }

  if (!entry.galleryPreviewImage) {
    return {
      tone: "warning" as const,
      title: "Preview media is missing",
      detail:
        "The listing can be reviewed, but the public gallery card may look incomplete until preview media is regenerated.",
    };
  }

  return {
    tone: "ok" as const,
    title: "Ready for public review",
    detail:
      "The share is active and the gallery listing has the core public metadata needed for review.",
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
      toast.error("Only moderators and admins can update gallery entries.");
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
          payload.ok
            ? "Failed to update gallery entry"
            : (payload.error ?? "Failed to update gallery entry")
        );
      }

      setEntries((previous) =>
        previous.map((entry) =>
          entry.shareToken === payload.entry.shareToken
            ? { ...entry, ...payload.entry }
            : entry
        )
      );

      toast.success(`Gallery entry ${action}d.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update gallery entry."
      );
    } finally {
      setPendingShareToken(null);
    }
  };

  const deleteEntry = async (shareToken: string) => {
    if (!canManageGallery) {
      toast.error("Only moderators and admins can delete gallery entries.");
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
          payload.ok
            ? "Failed to delete gallery entry"
            : (payload.error ?? "Failed to delete gallery entry")
        );
      }

      setEntries((previous) =>
        previous.filter((entry) => entry.shareToken !== shareToken)
      );
      setDeleteCandidate(null);
      toast.success("Gallery entry deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete gallery entry."
      );
    } finally {
      setPendingShareToken(null);
    }
  };

  const copyShareLink = async (entry: DashboardGalleryEntry) => {
    const href = `${window.location.origin}/share/${entry.shareToken}`;

    try {
      await navigator.clipboard.writeText(href);
      toast.success("Share link copied.");
    } catch {
      toast.error("Could not copy the share link.");
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label}.`);
    }
  };

  function getFeatureAction(entry: DashboardGalleryEntry) {
    return entry.galleryState !== "featured"
      ? {
          action: "feature" as const,
          label: "Feature",
          icon: Sparkles,
        }
      : {
          action: "unfeature" as const,
          label: "Unfeature",
          icon: StarOff,
        };
  }

  function getVisibilityAction(entry: DashboardGalleryEntry) {
    return entry.galleryState !== "hidden"
      ? {
          action: "hide" as const,
          label: "Hide",
          icon: EyeOff,
        }
      : {
          action: "restore" as const,
          label: "Restore",
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
          Track
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
      header: "Owner",
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
      header: "State",
      meta: { className: "w-28" },
      cell: ({ row }) => (
        <Badge variant={getStateVariant(row.original.galleryState)}>
          {getStateLabel(row.original.galleryState)}
        </Badge>
      ),
    },
    {
      id: "shareLifecycle",
      header: "Share",
      accessorFn: (row) => getShareLifecycleState(row),
      meta: { className: "w-44" },
      cell: ({ row }) => {
        const lifecycleState = getShareLifecycleState(row.original);

        return (
          <div className="min-w-0">
            <Badge variant={getShareLifecycleVariant(lifecycleState)}>
              {getShareLifecycleLabel(lifecycleState)}
            </Badge>
            <p className="text-muted-foreground mt-1 truncate text-xs">
              {getShareLifecycleDetail(row.original)}
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
          Published
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
              <ActionTooltip label="Delete">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-muted hover:text-destructive size-7"
                  disabled={isPending || !canManageGallery}
                  aria-label={`Delete ${entry.galleryTitle}`}
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
                  aria-label="Open gallery entry actions"
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
                  Delete
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
  const stateFilterOptions = stateFilters.map((filter) => ({
    ...filter,
    count: stateFacetRows.filter(
      (row) => row.original.galleryState === filter.value
    ).length,
  }));
  const shareFilterOptions = shareFilters.map((filter) => ({
    ...filter,
    count: shareFacetRows.filter(
      (row) => getShareLifecycleState(row.original) === filter.value
    ).length,
  }));
  const expiredShareCount = entries.filter(
    (entry) => getShareLifecycleState(entry) === "expired"
  ).length;
  const revokedShareCount = entries.filter(
    (entry) => getShareLifecycleState(entry) === "revoked"
  ).length;
  const emptyMessage =
    entries.length === 0
      ? "No gallery entries yet."
      : "No gallery entries match the current filters.";
  const inspectShareLifecycle = inspectCandidate
    ? getShareLifecycleState(inspectCandidate)
    : null;
  const inspectPreviewImageUrl = inspectCandidate
    ? getPreviewImageUrl(inspectCandidate)
    : null;
  const inspectSummary = inspectCandidate
    ? getInspectSummary(inspectCandidate)
    : null;

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder="Search title, description or owner..."
      >
        <DataTableFacetFilter
          title="State"
          selected={selectedGalleryStates}
          options={stateFilterOptions}
          onChange={setSelectedGalleryStates}
        />
        <DataTableFacetFilter
          title="Share"
          selected={selectedShareLifecycles}
          options={shareFilterOptions}
          onChange={setSelectedShareLifecycles}
        />
      </DataTableToolbar>

      <p className="text-muted-foreground text-xs">
        Changes apply immediately to the public gallery. {expiredShareCount}{" "}
        expired and {revokedShareCount} revoked linked shares are visible here
        for operator cleanup.
      </p>

      <DataTable
        table={table}
        rows={filteredRows}
        columnsLength={columns.length}
        emptyMessage={emptyMessage}
        minWidthClassName="min-w-[920px]"
        emptyClassName="py-8"
        onRowClick={(row) => setInspectCandidate(row.original)}
        getRowAriaLabel={(row) => `Inspect ${row.original.galleryTitle}`}
      />

      <p className="text-muted-foreground text-xs">
        Showing {filteredRows.length} of {entries.length} gallery entries.
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
                      Inspect public gallery readiness and share lifecycle.
                    </DialogDescription>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Badge
                      variant={getStateVariant(inspectCandidate.galleryState)}
                    >
                      {getStateLabel(inspectCandidate.galleryState)}
                    </Badge>
                    <Badge
                      variant={getShareLifecycleVariant(inspectShareLifecycle)}
                    >
                      {getShareLifecycleLabel(inspectShareLifecycle)}
                    </Badge>
                    <Badge
                      variant={inspectPreviewImageUrl ? "outline" : "muted"}
                    >
                      Preview {inspectPreviewImageUrl ? "ready" : "missing"}
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
                            No preview media
                          </p>
                        </div>
                      )}
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
                      <InspectMetric
                        label="Field"
                        value={formatFieldSize(inspectCandidate)}
                      />
                      <InspectMetric
                        label="Elements"
                        value={formatElementCount(inspectCandidate)}
                      />
                      <InspectMetric
                        label="Published"
                        value={formatDate(inspectCandidate.galleryPublishedAt)}
                      />
                      <InspectMetric
                        label="Updated"
                        value={formatDate(inspectCandidate.updatedAt)}
                      />
                    </dl>
                  </div>

                  <div className="space-y-7 p-6">
                    <InspectSection title="Review outcome">
                      <InspectNotice
                        tone={inspectSummary.tone}
                        title={inspectSummary.title}
                        detail={inspectSummary.detail}
                      />
                    </InspectSection>

                    <InspectSection title="Public listing">
                      <dl className="space-y-1">
                        <InspectDetail
                          label="Description"
                          value={
                            <span className="leading-6">
                              {inspectCandidate.galleryDescription ||
                                "No gallery description has been provided."}
                            </span>
                          }
                        />
                        <InspectDetail
                          label="Share title"
                          value={
                            inspectCandidate.shareTitle || "Untitled track"
                          }
                        />
                      </dl>
                    </InspectSection>

                    <InspectSection title="Share lifecycle">
                      <dl className="space-y-1">
                        <InspectDetail
                          label="Type"
                          value={
                            <Badge
                              variant={
                                inspectCandidate.shareType === "published"
                                  ? "outline"
                                  : "muted"
                              }
                            >
                              {inspectCandidate.shareType === "published"
                                ? "Published"
                                : "Temporary"}
                            </Badge>
                          }
                        />
                        <InspectDetail
                          label="Embed"
                          value={
                            getEmbedAvailable(inspectCandidate) ? (
                              <Link
                                href={`/embed/${inspectCandidate.shareToken}`}
                                className="flex items-center gap-1 text-sm hover:underline"
                              >
                                <Link2 className="size-3.5 shrink-0" />
                                Available
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                {getEmbedUnavailableReason(inspectCandidate) ??
                                  "Not available"}
                              </span>
                            )
                          }
                        />
                        {inspectCandidate.projectId ? (
                          <InspectDetail
                            label="Project ID"
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
                                  aria-label="Copy project ID"
                                  onClick={() =>
                                    void copyToClipboard(
                                      inspectCandidate.projectId!,
                                      "Project ID"
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
                          label="Share created"
                          value={formatDate(inspectCandidate.shareCreatedAt)}
                        />
                        <InspectDetail
                          label="Entry updated"
                          value={formatDate(inspectCandidate.updatedAt)}
                        />
                        {inspectCandidate.shareExpiresAt ? (
                          <InspectDetail
                            label="Expires"
                            value={formatDate(inspectCandidate.shareExpiresAt)}
                          />
                        ) : null}
                        {inspectCandidate.shareRevokedAt ? (
                          <InspectDetail
                            label="Revoked"
                            value={formatDate(inspectCandidate.shareRevokedAt)}
                          />
                        ) : null}
                      </dl>
                    </InspectSection>

                    <InspectSection title="Record">
                      <dl className="space-y-1">
                        <InspectDetail
                          label="Owner"
                          value={getOwnerLabel(inspectCandidate)}
                        />
                        <InspectDetail
                          label="Owner email"
                          value={
                            inspectCandidate.ownerEmail ??
                            inspectCandidate.ownerUserId
                          }
                        />
                        <InspectDetail
                          label="Owner ID"
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
                                aria-label="Copy owner ID"
                                onClick={() =>
                                  void copyToClipboard(
                                    inspectCandidate.ownerUserId,
                                    "Owner ID"
                                  )
                                }
                              >
                                <Copy className="size-3" />
                              </Button>
                            </span>
                          }
                        />
                        <InspectDetail
                          label="Share token"
                          value={
                            <span className="font-mono text-xs">
                              {inspectCandidate.shareToken}
                            </span>
                          }
                        />
                        {inspectCandidate.galleryPreviewImage ? (
                          <InspectDetail
                            label="Preview file"
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
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copyShareLink(inspectCandidate)}
                  >
                    <Copy className="size-4" />
                    Copy link
                  </Button>
                  <Button asChild>
                    <Link href={`/share/${inspectCandidate.shareToken}`}>
                      <ExternalLink className="size-4" />
                      Open share
                    </Link>
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : (
            <DialogHeader className="p-6 pr-12">
              <DialogTitle>Gallery entry</DialogTitle>
              <DialogDescription>
                Select a gallery row to inspect its public context.
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
            <DialogTitle>Delete gallery entry?</DialogTitle>
            <DialogDescription>
              This removes the gallery record for{" "}
              <span className="text-foreground font-medium">
                {deleteCandidate?.galleryTitle ?? "this track"}
              </span>
              . The public gallery card disappears, while the underlying share
              link remains governed by the share record.
            </DialogDescription>
          </DialogHeader>

          <div className="text-muted-foreground space-y-2 text-sm">
            <p>
              Owner:{" "}
              <span className="text-foreground">
                {deleteCandidate ? getOwnerLabel(deleteCandidate) : "Unknown"}
              </span>
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
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
                  Deleting…
                </>
              ) : (
                "Delete entry"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
