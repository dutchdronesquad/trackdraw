"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { type SortingState, useTable } from "@tanstack/react-table";
import {
  Ban,
  Clock3,
  ExternalLink,
  Link2,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  formatDate,
  getExpectedCleanupDate,
  getGalleryStateTone,
  getLifecycleDetail,
  getLifecycleState,
  getLifecycleTone,
  getOwnerLabel,
  getSharesColumns,
  isShareExpiringSoon,
  type Translate,
} from "@/app/dashboard/shares/columns";
import {
  DangerAction,
  DetailList,
  DetailSection,
} from "@/components/dashboard/DetailSheet";
import StatusFilter from "@/components/dashboard/StatusFilter";
import ToneBadge from "@/components/dashboard/ToneBadge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { dataTableFeatures } from "@/components/data-table/tableFeatures";
import type { AccountRole } from "@/lib/account/roles";
import type { DashboardShare } from "@/lib/server/shares";

type DashboardSharesManagerProps = {
  currentUserRole: AccountRole;
  initialShares: DashboardShare[];
};

type ShareTypeFilterValue = "published" | "temporary";
type ShareOwnerFilterValue = "anonymous" | "account";

const sharesManagerRoles: AccountRole[] = ["moderator", "admin"];
const purgeManagerRoles: AccountRole[] = ["admin"];
type ShareSegment = "all" | "active" | "expiring" | "revoked" | "expired";

const segmentFilters: Record<ShareSegment, (share: DashboardShare) => boolean> =
  {
    all: () => true,
    active: (share) => getLifecycleState(share) === "active",
    expiring: (share) => isShareExpiringSoon(share),
    revoked: (share) => getLifecycleState(share) === "revoked",
    expired: (share) => getLifecycleState(share) === "expired",
  };

const typeFilterValues: ShareTypeFilterValue[] = ["published", "temporary"];
const ownerFilterValues: ShareOwnerFilterValue[] = ["anonymous", "account"];

function getOwnerFilterValue(share: DashboardShare): ShareOwnerFilterValue {
  return share.ownerUserId ? "account" : "anonymous";
}

export default function DashboardSharesManager({
  currentUserRole,
  initialShares,
}: DashboardSharesManagerProps) {
  const t = useTranslations("dashboard.shares");
  const tCommon = useTranslations("common");
  const [shares, setShares] = useState(initialShares);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [segment, setSegment] = useState<ShareSegment>("all");
  const [inspectShare, setInspectShare] = useState<DashboardShare | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<ShareTypeFilterValue[]>(
    []
  );
  const [selectedOwners, setSelectedOwners] = useState<ShareOwnerFilterValue[]>(
    []
  );
  const [revokeCandidate, setRevokeCandidate] = useState<DashboardShare | null>(
    null
  );
  const [purgeCandidate, setPurgeCandidate] = useState<DashboardShare | null>(
    null
  );

  const canManageShares = sharesManagerRoles.includes(currentUserRole);
  const canPurgeShares = purgeManagerRoles.includes(currentUserRole);

  const revoke = async (token: string) => {
    if (!canManageShares) {
      toast.error(t("restrictions.manage"));
      return;
    }

    setPendingToken(token);

    try {
      const response = await fetch(
        `/api/dashboard/shares/${encodeURIComponent(token)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "revoke" }),
        }
      );

      const payload = (await response.json()) as
        { ok: true } | { ok: false; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok
            ? t("messages.revokeFailed")
            : (payload.error ?? t("messages.revokeFailed"))
        );
      }

      setShares((previous) =>
        previous.map((share) =>
          share.token === token
            ? {
                ...share,
                revokedAt: new Date().toISOString(),
                galleryState: null,
              }
            : share
        )
      );
      setInspectShare((previous) =>
        previous?.token === token
          ? {
              ...previous,
              revokedAt: new Date().toISOString(),
              galleryState: null,
            }
          : previous
      );
      setRevokeCandidate(null);
      toast.success(t("messages.revokeSuccess"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("messages.revokeFailed")
      );
    } finally {
      setPendingToken(null);
    }
  };

  const purge = async (token: string) => {
    if (!canPurgeShares) {
      toast.error(t("restrictions.purge"));
      return;
    }

    setPendingToken(token);

    try {
      const response = await fetch(
        `/api/dashboard/shares/${encodeURIComponent(token)}`,
        { method: "DELETE" }
      );

      const payload = (await response.json()) as
        { ok: true } | { ok: false; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.ok
            ? t("messages.purgeFailed")
            : (payload.error ?? t("messages.purgeFailed"))
        );
      }

      setShares((previous) =>
        previous.filter((share) => share.token !== token)
      );
      setInspectShare((previous) =>
        previous?.token === token ? null : previous
      );
      setPurgeCandidate(null);
      toast.success(t("messages.purgeSuccess"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("messages.purgeFailed")
      );
    } finally {
      setPendingToken(null);
    }
  };

  const copyShareLink = useCallback(
    async (token: string) => {
      const href = `${window.location.origin}/share/${token}`;

      try {
        await window.navigator.clipboard.writeText(href);
        toast.success(t("messages.copyLinkSuccess"));
      } catch {
        toast.error(t("messages.copyLinkFailed"));
      }
    },
    [t]
  );

  const columns = useMemo(
    () =>
      getSharesColumns({
        t: t as unknown as Translate,
        tCommon: tCommon as unknown as Translate,
        pendingToken,
        canManageShares,
        canPurgeShares,
        onCopyLink: (token) => void copyShareLink(token),
        onRevokeCandidate: setRevokeCandidate,
        onPurgeCandidate: setPurgeCandidate,
      }),
    [canManageShares, canPurgeShares, copyShareLink, pendingToken, t, tCommon]
  );
  const segmentedShares = useMemo(
    () => shares.filter(segmentFilters[segment]),
    [shares, segment]
  );
  const columnFilters = useMemo(
    () => [
      ...(selectedTypes.length > 0
        ? [{ id: "type", value: selectedTypes }]
        : []),
      ...(selectedOwners.length > 0
        ? [{ id: "owner", value: selectedOwners }]
        : []),
    ],
    [selectedOwners, selectedTypes]
  );

  const table = useTable({
    features: dataTableFeatures,
    data: segmentedShares,
    columns,
    state: { globalFilter, sorting, columnFilters },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const share = row.original;
      const q = filterValue.toLowerCase();
      return (
        share.title.toLowerCase().includes(q) ||
        share.token.toLowerCase().includes(q) ||
        getOwnerLabel(share, t as unknown as Translate)
          .toLowerCase()
          .includes(q)
      );
    },
  });

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const typeFacetRows =
    table.getColumn("type")?.getFacetedRowModel().rows ?? [];
  const ownerFacetRows =
    table.getColumn("owner")?.getFacetedRowModel().rows ?? [];
  const typeFilterOptions = typeFilterValues.map((value) => ({
    value,
    label: t(`typeValues.${value}`),
    count: typeFacetRows.filter((row) => row.original.shareType === value)
      .length,
  }));
  const ownerFilterOptions = ownerFilterValues.map((value) => ({
    value,
    label: t(`ownerValues.${value}`),
    count: ownerFacetRows.filter(
      (row) => getOwnerFilterValue(row.original) === value
    ).length,
  }));
  const emptyMessage =
    shares.length === 0 ? t("empty.default") : t("empty.filtered");
  const segmentCount = (value: ShareSegment) =>
    shares.filter(segmentFilters[value]).length;
  const visibleRows = table.getRowModel().rows;
  const tr = t as unknown as Translate;
  const inspectState = inspectShare ? getLifecycleState(inspectShare) : null;
  const inspectCleanup = inspectShare
    ? getExpectedCleanupDate(inspectShare)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
              value: "active",
              label: t("segments.active"),
              count: segmentCount("active"),
            },
            {
              value: "expiring",
              label: t("segments.expiring"),
              count: segmentCount("expiring"),
              attention: true,
            },
            {
              value: "revoked",
              label: t("segments.revoked"),
              count: segmentCount("revoked"),
            },
            {
              value: "expired",
              label: t("segments.expired"),
              count: segmentCount("expired"),
            },
          ]}
        />
        <p className="text-muted-foreground flex items-start gap-1.5 text-xs leading-relaxed lg:max-w-md">
          <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="text-foreground font-medium">
              {t("retention.title")}
            </span>{" "}
            <span>{t("retention.description")}</span>
          </span>
        </p>
      </div>

      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={t("filters.searchPlaceholder")}
      >
        <DataTableFacetFilter
          title={t("filters.type")}
          selected={selectedTypes}
          options={typeFilterOptions}
          onChange={setSelectedTypes}
        />
        <DataTableFacetFilter
          title={t("filters.owner")}
          selected={selectedOwners}
          options={ownerFilterOptions}
          onChange={setSelectedOwners}
        />
      </DataTableToolbar>

      {isMobile ? (
        <ul className="divide-y overflow-hidden rounded-lg border">
          {visibleRows.length > 0 ? (
            visibleRows.map((row) => {
              const share = row.original;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setInspectShare(share)}
                    className="hover:bg-muted/50 flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {share.title}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {getOwnerLabel(share, tr)} ·{" "}
                        {getLifecycleDetail(share, tr)}
                      </span>
                    </span>
                    <ToneBadge tone={getLifecycleTone(share)}>
                      {t(`statusValues.${getLifecycleState(share)}`)}
                    </ToneBadge>
                  </button>
                </li>
              );
            })
          ) : (
            <li className="text-muted-foreground px-4 py-6 text-center text-sm">
              {emptyMessage}
            </li>
          )}
        </ul>
      ) : null}

      <DataTable
        table={table}
        columnsLength={columns.length}
        emptyMessage={emptyMessage}
        minWidthClassName="min-w-[920px]"
        emptyClassName="py-8"
        wrapperClassName={isMobile ? "hidden" : undefined}
        onRowClick={(row) => setInspectShare(row.original)}
        getRowAriaLabel={(row) => t("aria.row", { title: row.original.title })}
        pagination={{
          summary: (
            <p className="text-muted-foreground text-xs">
              {t("status.showing", {
                filtered: filteredRowCount,
                total: shares.length,
              })}
            </p>
          ),
        }}
      />

      <Sheet
        open={inspectShare !== null}
        onOpenChange={(open) => {
          if (!open) setInspectShare(null);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          {inspectShare && inspectState ? (
            <>
              <SheetHeader className="border-b p-6 pr-12 text-left">
                <SheetTitle className="truncate text-base">
                  {inspectShare.title}
                </SheetTitle>
                <SheetDescription className="truncate">
                  {getOwnerLabel(inspectShare, tr)}
                  {inspectShare.ownerEmail
                    ? ` · ${inspectShare.ownerEmail}`
                    : ""}
                </SheetDescription>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <ToneBadge tone={getLifecycleTone(inspectShare)}>
                    {t(`statusValues.${inspectState}`)}
                  </ToneBadge>
                  <ToneBadge
                    tone={
                      inspectShare.shareType === "published" ? "sky" : "neutral"
                    }
                  >
                    {t(`typeValues.${inspectShare.shareType}`)}
                  </ToneBadge>
                  {inspectShare.galleryState ? (
                    <ToneBadge
                      tone={getGalleryStateTone(inspectShare.galleryState)}
                    >
                      {tCommon(`status.${inspectShare.galleryState}`)}
                    </ToneBadge>
                  ) : null}
                </div>
              </SheetHeader>

              <DetailSection title={t("panel.sections.link")}>
                <p className="bg-background mb-3 rounded-md border px-3 py-2 font-mono text-xs break-all">
                  {`/share/${inspectShare.token}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void copyShareLink(inspectShare.token)}
                  >
                    <Link2 />
                    {t("actions.copyLink")}
                  </Button>
                  {inspectState !== "revoked" ? (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/share/${inspectShare.token}`}
                        target="_blank"
                        rel="noreferrer"
                        prefetch={false}
                      >
                        <ExternalLink />
                        {t("actions.open")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </DetailSection>

              <DetailSection title={t("panel.sections.lifecycle")}>
                <DetailList
                  items={[
                    {
                      label: t("table.created"),
                      value: formatDate(inspectShare.createdAt),
                    },
                    {
                      label: t("panel.fields.status"),
                      value: getLifecycleDetail(inspectShare, tr),
                      className: isShareExpiringSoon(inspectShare)
                        ? "font-medium text-amber-700 dark:text-amber-300"
                        : undefined,
                    },
                    {
                      label: t("panel.fields.cleanup"),
                      value: inspectCleanup ?? t("panel.fields.notScheduled"),
                    },
                    {
                      label: t("table.gallery"),
                      value: inspectShare.galleryState
                        ? tCommon(`status.${inspectShare.galleryState}`)
                        : t("table.notInGallery"),
                    },
                  ]}
                />
              </DetailSection>

              {canManageShares ? (
                <DetailSection className="space-y-2">
                  {inspectState !== "revoked" ? (
                    <DangerAction
                      description={t("panel.messages.revokeDescription")}
                      action={
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 shrink-0 gap-1.5 px-2.5 text-xs shadow-none"
                          onClick={() => setRevokeCandidate(inspectShare)}
                        >
                          <Ban className="size-3.5" />
                          {t("actions.revoke")}
                        </Button>
                      }
                    />
                  ) : null}
                  {inspectState === "revoked" && canPurgeShares ? (
                    <DangerAction
                      description={t("panel.messages.purgeDescription")}
                      action={
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 shrink-0 gap-1.5 px-2.5 text-xs shadow-none"
                          onClick={() => setPurgeCandidate(inspectShare)}
                        >
                          <Trash2 className="size-3.5" />
                          {t("panel.actions.purge")}
                        </Button>
                      }
                    />
                  ) : null}
                </DetailSection>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={revokeCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeCandidate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("revokeDialog.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("revokeDialog.description", {
                title:
                  revokeCandidate?.title ?? t("revokeDialog.fallbackTitle"),
                strong: (chunks) => (
                  <span className="text-foreground font-medium">{chunks}</span>
                ),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="text-muted-foreground space-y-2 text-sm">
            <p>
              {t("revokeDialog.owner")}{" "}
              <span className="text-foreground">
                {revokeCandidate
                  ? getOwnerLabel(revokeCandidate, t as unknown as Translate)
                  : t("owner.anonymous")}
              </span>
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("revokeDialog.cancel")}</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={
                !revokeCandidate ||
                pendingToken === revokeCandidate.token ||
                !canManageShares
              }
              onClick={() => {
                if (!revokeCandidate) return;
                void revoke(revokeCandidate.token);
              }}
            >
              {revokeCandidate && pendingToken === revokeCandidate.token ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("revokeDialog.revoking")}
                </>
              ) : (
                t("revokeDialog.revokeShare")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={purgeCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setPurgeCandidate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("purgeDialog.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("purgeDialog.description", {
                title: purgeCandidate?.title ?? t("purgeDialog.fallbackTitle"),
                strong: (chunks) => (
                  <span className="text-foreground font-medium">{chunks}</span>
                ),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="text-muted-foreground space-y-2 text-sm">
            <p>
              {t("purgeDialog.owner")}{" "}
              <span className="text-foreground">
                {purgeCandidate
                  ? getOwnerLabel(purgeCandidate, t as unknown as Translate)
                  : t("owner.anonymous")}
              </span>
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("purgeDialog.cancel")}</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={
                !purgeCandidate ||
                pendingToken === purgeCandidate.token ||
                !canPurgeShares
              }
              onClick={() => {
                if (!purgeCandidate) return;
                void purge(purgeCandidate.token);
              }}
            >
              {purgeCandidate && pendingToken === purgeCandidate.token ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("purgeDialog.purging")}
                </>
              ) : (
                t("purgeDialog.purgeShare")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
