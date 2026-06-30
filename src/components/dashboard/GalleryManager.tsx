"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  ImageOff,
  Info,
  Link2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatElementCount,
  formatFieldSize,
  getEmbedAvailable,
  getEmbedUnavailableReason,
  getGalleryColumns,
  getInspectSummary,
  getOwnerLabel,
  getPreviewImageUrl,
  getShareLifecycleLabel,
  getShareLifecycleState,
  getShareLifecycleVariant,
  getStateLabel,
  getStateVariant,
  type GalleryUpdateAction,
  type Translate,
} from "@/app/dashboard/gallery/columns";
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
import DataTable from "@/components/data-table/DataTable";
import DataTableFacetFilter from "@/components/data-table/DataTableFacetFilter";
import DataTableToolbar from "@/components/data-table/DataTableToolbar";
import type { AccountRole } from "@/lib/account/roles";
import type {
  DashboardGalleryEntry,
  GalleryState,
  StoredGalleryEntry,
} from "@/lib/server/gallery";

type DashboardGalleryManagerProps = {
  currentUserRole: AccountRole;
  initialEntries: DashboardGalleryEntry[];
};

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
  const tCommon = useTranslations("common");
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
        { ok: true; entry: StoredGalleryEntry } | { ok: false; error?: string };

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

      toast.success(t("messages.updateSuccess", { action }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("messages.updateFailed")
      );
    } finally {
      setPendingShareToken(null);
    }
  };

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

  const columns = getGalleryColumns({
    t: t as unknown as Translate,
    tCommon: tCommon as unknown as Translate,
    pendingShareToken,
    canManageGallery,
    onUpdateEntry: (shareToken, action) => void updateEntry(shareToken, action),
    onDeleteCandidate: setDeleteCandidate,
  });

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

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={t("filters.searchPlaceholder")}
      >
        <DataTableFacetFilter
          title={t("filters.state")}
          selected={selectedGalleryStates}
          options={stateFilterOptions}
          onChange={setSelectedGalleryStates}
        />
        <DataTableFacetFilter
          title={t("filters.share")}
          selected={selectedShareLifecycles}
          options={shareFilterOptions}
          onChange={setSelectedShareLifecycles}
        />
      </DataTableToolbar>

      <DataTable
        table={table}
        rows={filteredRows}
        columnsLength={columns.length}
        emptyMessage={emptyMessage}
        minWidthClassName="min-w-[920px]"
        emptyClassName="py-8"
        onRowClick={(row) => setInspectCandidate(row.original)}
        getRowAriaLabel={(row) =>
          t("aria.row", { title: row.original.galleryTitle })
        }
      />

      <p className="text-muted-foreground text-xs">
        {t("status.showing", {
          filtered: filteredRows.length,
          total: entries.length,
        })}
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
                        t as unknown as Translate,
                        tCommon as unknown as Translate
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
                                ) ?? t("fallback.notAvailable")}
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
