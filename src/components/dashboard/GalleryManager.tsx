"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { type SortingState, useTable } from "@tanstack/react-table";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  ImageOff,
  Info,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatElementCount,
  formatFieldSize,
  getEmbedAvailable,
  getEmbedUnavailableReason,
  getFeatureAction,
  getGalleryColumns,
  getInspectSummary,
  getOwnerLabel,
  getPreviewImageUrl,
  getShareLifecycleLabel,
  getShareLifecycleState,
  getShareLifecycleTone,
  getStateLabel,
  getStateTone,
  getVisibilityAction,
  type GalleryUpdateAction,
  type Translate,
} from "@/app/dashboard/gallery/columns";
import {
  DangerAction,
  DetailSection,
  DetailStats,
} from "@/components/dashboard/DetailSheet";
import StatusFilter from "@/components/dashboard/StatusFilter";
import ToneBadge from "@/components/dashboard/ToneBadge";
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
import DataTable from "@/components/data-table/DataTable";
import DataTableFacetFilter from "@/components/data-table/DataTableFacetFilter";
import DataTablePagination from "@/components/data-table/DataTablePagination";
import DataTableToolbar from "@/components/data-table/DataTableToolbar";
import { dataTableFeatures } from "@/components/data-table/tableFeatures";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AccountRole } from "@/lib/account/roles";
import { cn } from "@/lib/utils";
import type {
  DashboardGalleryEntry,
  StoredGalleryEntry,
} from "@/lib/server/gallery";

type DashboardGalleryManagerProps = {
  currentUserRole: AccountRole;
  initialEntries: DashboardGalleryEntry[];
};

type ShareLifecycleState = "active" | "expired" | "revoked";

const galleryManagerRoles: AccountRole[] = ["moderator", "admin"];
const shareFilterValues: ShareLifecycleState[] = [
  "active",
  "expired",
  "revoked",
];

type GallerySegment =
  "all" | "featured" | "listed" | "hidden" | "missingPreview";

const segmentFilters: Record<
  GallerySegment,
  (entry: DashboardGalleryEntry) => boolean
> = {
  all: () => true,
  featured: (entry) => entry.galleryState === "featured",
  listed: (entry) => entry.galleryState === "listed",
  hidden: (entry) => entry.galleryState === "hidden",
  missingPreview: (entry) => getPreviewImageUrl(entry) === null,
};

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

export default function DashboardGalleryManager({
  currentUserRole,
  initialEntries,
}: DashboardGalleryManagerProps) {
  const t = useTranslations("dashboard.gallery");
  const tCommon = useTranslations("common");
  const [entries, setEntries] = useState(initialEntries);
  const [segment, setSegment] = useState<GallerySegment>("all");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pendingShareToken, setPendingShareToken] = useState<string | null>(
    null
  );
  const [selectedShareLifecycles, setSelectedShareLifecycles] = useState<
    ShareLifecycleState[]
  >([]);
  const [inspectCandidate, setInspectCandidate] =
    useState<DashboardGalleryEntry | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<DashboardGalleryEntry | null>(null);

  const canManageGallery = galleryManagerRoles.includes(currentUserRole);

  const updateEntry = useCallback(
    async (shareToken: string, action: GalleryUpdateAction) => {
      if (!canManageGallery) {
        toast.error(t("restrictions.manage"));
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
              ? t("messages.updateFailed")
              : (payload.error ?? t("messages.updateFailed"))
          );
        }

        setEntries((previous) =>
          previous.map((entry) =>
            entry.shareToken === payload.entry.shareToken
              ? { ...entry, ...payload.entry }
              : entry
          )
        );

        setInspectCandidate((previous) =>
          previous?.shareToken === payload.entry.shareToken
            ? { ...previous, ...payload.entry }
            : previous
        );
        toast.success(t("messages.updateSuccess", { action }));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("messages.updateFailed")
        );
      } finally {
        setPendingShareToken(null);
      }
    },
    [canManageGallery, t]
  );

  const deleteEntry = async (shareToken: string) => {
    if (!canManageGallery) {
      toast.error(t("restrictions.delete"));
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
        { ok: true } | { ok: false; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok
            ? t("messages.deleteFailed")
            : (payload.error ?? t("messages.deleteFailed"))
        );
      }

      setEntries((previous) =>
        previous.filter((entry) => entry.shareToken !== shareToken)
      );
      setDeleteCandidate(null);
      setInspectCandidate((previous) =>
        previous?.shareToken === shareToken ? null : previous
      );
      toast.success(t("messages.deleteSuccess"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("messages.deleteFailed")
      );
    } finally {
      setPendingShareToken(null);
    }
  };

  const copyShareLink = async (entry: DashboardGalleryEntry) => {
    const href = `${window.location.origin}/share/${entry.shareToken}`;

    try {
      await navigator.clipboard.writeText(href);
      toast.success(t("messages.copyLinkSuccess"));
    } catch {
      toast.error(t("messages.copyLinkFailed"));
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("messages.copySuccess", { label }));
    } catch {
      toast.error(t("messages.copyFailed", { label }));
    }
  };

  const columns = useMemo(
    () =>
      getGalleryColumns({
        t: t as unknown as Translate,
        tCommon: tCommon as unknown as Translate,
        pendingShareToken,
        canManageGallery,
        onUpdateEntry: (shareToken, action) =>
          void updateEntry(shareToken, action),
        onDeleteCandidate: setDeleteCandidate,
      }),
    [canManageGallery, pendingShareToken, t, tCommon, updateEntry]
  );
  const segmentedEntries = useMemo(
    () => entries.filter(segmentFilters[segment]),
    [entries, segment]
  );
  const columnFilters = useMemo(
    () =>
      selectedShareLifecycles.length > 0
        ? [{ id: "shareLifecycle", value: selectedShareLifecycles }]
        : [],
    [selectedShareLifecycles]
  );

  const table = useTable({
    features: dataTableFeatures,
    data: segmentedEntries,
    columns,
    state: { globalFilter, sorting, columnFilters },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
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
  });

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const shareFacetRows =
    table.getColumn("shareLifecycle")?.getFacetedRowModel().rows ?? [];
  const shareFilterOptions = shareFilterValues.map((value) => ({
    value,
    label: t(`shareValues.${value}`),
    count: shareFacetRows.filter(
      (row) => getShareLifecycleState(row.original) === value
    ).length,
  }));
  const emptyMessage =
    entries.length === 0 ? t("empty.default") : t("empty.filtered");
  const inspectShareLifecycle = inspectCandidate
    ? getShareLifecycleState(inspectCandidate)
    : null;
  const inspectPreviewImageUrl = inspectCandidate
    ? getPreviewImageUrl(inspectCandidate)
    : null;
  const inspectSummary = inspectCandidate
    ? getInspectSummary(inspectCandidate, t as unknown as Translate)
    : null;

  const segmentCount = (value: GallerySegment) =>
    entries.filter(segmentFilters[value]).length;
  const visibleRows = table.getRowModel().rows;
  const tr = t as unknown as Translate;
  const trCommon = tCommon as unknown as Translate;
  const inspectFeatureAction = inspectCandidate
    ? getFeatureAction(inspectCandidate, tr)
    : null;
  const inspectVisibilityAction = inspectCandidate
    ? getVisibilityAction(inspectCandidate, tr)
    : null;
  const inspectPending =
    inspectCandidate !== null &&
    pendingShareToken === inspectCandidate.shareToken;

  return (
    <div className="space-y-4">
      <StatusFilter
        label={t("segments.label")}
        value={segment}
        onChange={setSegment}
        items={[
          {
            value: "all",
            label: t("segments.all"),
            count: segmentCount("all"),
          },
          {
            value: "featured",
            label: t("segments.featured"),
            count: segmentCount("featured"),
          },
          {
            value: "listed",
            label: t("segments.listed"),
            count: segmentCount("listed"),
          },
          {
            value: "hidden",
            label: t("segments.hidden"),
            count: segmentCount("hidden"),
          },
          {
            value: "missingPreview",
            label: t("segments.missingPreview"),
            count: segmentCount("missingPreview"),
            attention: true,
          },
        ]}
      />

      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={t("filters.searchPlaceholder")}
      >
        <DataTableFacetFilter
          title={t("filters.share")}
          selected={selectedShareLifecycles}
          options={shareFilterOptions}
          onChange={setSelectedShareLifecycles}
        />
        <div
          role="group"
          aria-label={t("view.label")}
          className="bg-muted inline-flex h-9 items-center gap-0.5 rounded-lg p-1"
        >
          {(
            [
              ["grid", LayoutGrid, t("view.grid")],
              ["table", List, t("view.table")],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              aria-label={label}
              onClick={() => setView(value)}
              className={cn(
                "text-muted-foreground inline-flex h-7 w-8 cursor-pointer items-center justify-center rounded-md transition-colors",
                view === value && "bg-background text-foreground shadow-sm"
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </DataTableToolbar>

      {view === "grid" ? (
        <div className="space-y-3">
          {visibleRows.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleRows.map((row) => {
                const item = row.original;
                const previewUrl = getPreviewImageUrl(item);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      aria-label={t("aria.row", { title: item.galleryTitle })}
                      onClick={() => setInspectCandidate(item)}
                      className="bg-card hover:border-brand-primary/40 focus-visible:ring-ring/40 flex w-full cursor-pointer flex-col overflow-hidden rounded-lg border text-left transition-colors outline-none focus-visible:ring-2"
                    >
                      <span className="bg-muted relative block aspect-video w-full">
                        {previewUrl ? (
                          <Image
                            src={previewUrl}
                            alt=""
                            fill
                            unoptimized
                            className={cn(
                              "object-cover",
                              item.galleryState === "hidden" && "opacity-55"
                            )}
                          />
                        ) : (
                          <span className="text-muted-foreground absolute inset-0 flex items-center justify-center gap-1.5 bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_6px,transparent_6px,transparent_12px)] text-xs font-medium">
                            <ImageOff className="size-3.5" aria-hidden="true" />
                            {t("inspect.noPreviewMedia")}
                          </span>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1 border-t px-3 pt-2.5 pb-3">
                        <span className="truncate text-sm font-medium">
                          {item.galleryTitle}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {getOwnerLabel(item)} ·{" "}
                          {formatDate(item.galleryPublishedAt)}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          <ToneBadge tone={getStateTone(item.galleryState)}>
                            {getStateLabel(item.galleryState, trCommon)}
                          </ToneBadge>
                          {previewUrl ? null : (
                            <ToneBadge tone="amber">
                              {t("inspect.previewMissing")}
                            </ToneBadge>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground rounded-lg border py-10 text-center text-sm">
              {emptyMessage}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-xs">
              {t("status.showing", {
                filtered: filteredRowCount,
                total: entries.length,
              })}
            </p>
            <DataTablePagination table={table} />
          </div>
        </div>
      ) : (
        <DataTable
          table={table}
          columnsLength={columns.length}
          emptyMessage={emptyMessage}
          minWidthClassName="min-w-[920px]"
          emptyClassName="py-8"
          onRowClick={(row) => setInspectCandidate(row.original)}
          getRowAriaLabel={(row) =>
            t("aria.row", { title: row.original.galleryTitle })
          }
          pagination={{
            summary: (
              <p className="text-muted-foreground text-xs">
                {t("status.showing", {
                  filtered: filteredRowCount,
                  total: entries.length,
                })}
              </p>
            ),
          }}
        />
      )}

      <Sheet
        open={inspectCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setInspectCandidate(null);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          {inspectCandidate && inspectShareLifecycle && inspectSummary ? (
            <>
              <div className="bg-muted relative aspect-video w-full shrink-0 border-b">
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

              <SheetHeader className="border-b p-6 text-left">
                <SheetTitle className="truncate text-base">
                  {inspectCandidate.galleryTitle}
                </SheetTitle>
                <SheetDescription className="truncate">
                  {getOwnerLabel(inspectCandidate)} ·{" "}
                  {formatDate(inspectCandidate.galleryPublishedAt)}
                </SheetDescription>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <ToneBadge tone={getStateTone(inspectCandidate.galleryState)}>
                    {getStateLabel(inspectCandidate.galleryState, trCommon)}
                  </ToneBadge>
                  <ToneBadge
                    tone={getShareLifecycleTone(inspectShareLifecycle)}
                  >
                    {getShareLifecycleLabel(inspectShareLifecycle, tr)}
                  </ToneBadge>
                  <ToneBadge
                    tone={inspectPreviewImageUrl ? "emerald" : "amber"}
                  >
                    {inspectPreviewImageUrl
                      ? t("inspect.previewReady")
                      : t("inspect.previewMissing")}
                  </ToneBadge>
                </div>
                <div className="flex flex-wrap gap-2 pt-3">
                  {canManageGallery &&
                  inspectFeatureAction &&
                  inspectVisibilityAction ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={inspectPending}
                        onClick={() =>
                          void updateEntry(
                            inspectCandidate.shareToken,
                            inspectFeatureAction.action
                          )
                        }
                      >
                        <inspectFeatureAction.icon />
                        {inspectFeatureAction.label}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={inspectPending}
                        onClick={() =>
                          void updateEntry(
                            inspectCandidate.shareToken,
                            inspectVisibilityAction.action
                          )
                        }
                      >
                        <inspectVisibilityAction.icon />
                        {inspectVisibilityAction.label}
                      </Button>
                    </>
                  ) : null}
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/share/${inspectCandidate.shareToken}`}
                      prefetch={false}
                    >
                      <ExternalLink />
                      {t("inspect.openShare")}
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void copyShareLink(inspectCandidate)}
                  >
                    <Copy />
                    {t("inspect.copyLink")}
                  </Button>
                </div>
              </SheetHeader>

              <DetailStats
                items={[
                  {
                    label: t("inspect.field"),
                    value: formatFieldSize(inspectCandidate, tr),
                  },
                  {
                    label: t("inspect.elements"),
                    value: formatElementCount(inspectCandidate, tr),
                  },
                  {
                    label: t("inspect.updated"),
                    value: formatDate(inspectCandidate.updatedAt),
                  },
                ]}
              />

              <DetailSection title={t("inspect.reviewOutcome")}>
                <InspectNotice
                  tone={inspectSummary.tone}
                  title={inspectSummary.title}
                  detail={inspectSummary.detail}
                />
              </DetailSection>

              <DetailSection title={t("inspect.publicListing")}>
                <p className="text-sm leading-6">
                  {inspectCandidate.galleryDescription ||
                    t("inspect.noDescription")}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {t("inspect.shareTitle")}:{" "}
                  {inspectCandidate.shareTitle || t("inspect.untitledTrack")}
                </p>
              </DetailSection>

              <DetailSection title={t("inspect.shareLifecycle")}>
                <dl className="space-y-1">
                  <InspectDetail
                    label={t("inspect.type")}
                    value={
                      inspectCandidate.shareType === "published"
                        ? t("inspect.published_")
                        : t("inspect.temporary")
                    }
                  />
                  <InspectDetail
                    label={t("inspect.embed")}
                    value={
                      getEmbedAvailable(inspectCandidate) ? (
                        <Link
                          href={`/embed/${inspectCandidate.shareToken}`}
                          prefetch={false}
                          className="flex items-center gap-1 text-sm hover:underline"
                        >
                          <Link2 className="size-3.5 shrink-0" />
                          {t("inspect.available")}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {getEmbedUnavailableReason(inspectCandidate, tr) ??
                            t("fallback.notAvailable")}
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
              </DetailSection>

              <DetailSection title={t("inspect.record")}>
                <dl className="space-y-1">
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
                        <span className="font-mono text-xs break-all">
                          {inspectCandidate.galleryPreviewImage}
                        </span>
                      }
                    />
                  ) : null}
                </dl>
              </DetailSection>

              {canManageGallery ? (
                <DetailSection>
                  <DangerAction
                    description={t("inspect.deleteDescription")}
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 shrink-0 gap-1.5 px-2.5 text-xs shadow-none"
                        onClick={() => setDeleteCandidate(inspectCandidate)}
                      >
                        <Trash2 className="size-3.5" />
                        {t("actions.delete")}
                      </Button>
                    }
                  />
                </DetailSection>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

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
