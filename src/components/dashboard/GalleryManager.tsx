"use client";

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
  Eye,
  EyeOff,
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
import type { AccountRole } from "@/lib/account-roles";
import type {
  DashboardGalleryEntry,
  GalleryState,
  StoredGalleryEntry,
} from "@/lib/server/gallery";

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
  >([]);
  const [selectedShareLifecycles, setSelectedShareLifecycles] = useState<
    ShareLifecycleState[]
  >([]);
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
          <div className="flex justify-end">
            <div className="hidden items-center justify-end gap-1 md:flex">
              <ActionTooltip label={featureAction.label}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
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
                  className="size-7"
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
                  className="text-destructive hover:text-destructive size-7"
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
      />

      <p className="text-muted-foreground text-xs">
        Showing {filteredRows.length} of {entries.length} gallery entries.
      </p>

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
