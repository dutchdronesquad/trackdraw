"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Clock3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getLifecycleState,
  getOwnerLabel,
  getSharesColumns,
  type ShareLifecycleState,
  type Translate,
} from "@/app/dashboard/shares/columns";
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
import type { DashboardShare } from "@/lib/server/shares";

type DashboardSharesManagerProps = {
  currentUserRole: AccountRole;
  initialShares: DashboardShare[];
};

type ShareTypeFilterValue = "published" | "temporary";
type ShareOwnerFilterValue = "anonymous" | "account";

const sharesManagerRoles: AccountRole[] = ["moderator", "admin"];
const purgeManagerRoles: AccountRole[] = ["admin"];
const lifecycleFilterValues: ShareLifecycleState[] = [
  "active",
  "expired",
  "revoked",
];
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
  const [selectedLifecycles, setSelectedLifecycles] = useState<
    ShareLifecycleState[]
  >([]);
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
  const columnFilters = useMemo(
    () => [
      ...(selectedLifecycles.length > 0
        ? [{ id: "status", value: selectedLifecycles }]
        : []),
      ...(selectedTypes.length > 0
        ? [{ id: "type", value: selectedTypes }]
        : []),
      ...(selectedOwners.length > 0
        ? [{ id: "owner", value: selectedOwners }]
        : []),
    ],
    [selectedLifecycles, selectedOwners, selectedTypes]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: shares,
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
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const lifecycleFacetRows =
    table.getColumn("status")?.getFacetedRowModel().rows ?? [];
  const typeFacetRows =
    table.getColumn("type")?.getFacetedRowModel().rows ?? [];
  const ownerFacetRows =
    table.getColumn("owner")?.getFacetedRowModel().rows ?? [];
  const lifecycleFilterOptions = lifecycleFilterValues.map((value) => ({
    value,
    label: t(`statusValues.${value}`),
    count: lifecycleFacetRows.filter(
      (row) => getLifecycleState(row.original) === value
    ).length,
  }));
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

  return (
    <div className="space-y-4">
      <div className="bg-muted/35 flex items-start gap-3 rounded-lg border px-4 py-3">
        <Clock3 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="space-y-0.5 text-sm">
          <p className="font-medium">{t("retention.title")}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("retention.description")}
          </p>
        </div>
      </div>

      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={t("filters.searchPlaceholder")}
      >
        <DataTableFacetFilter
          title={t("filters.status")}
          selected={selectedLifecycles}
          options={lifecycleFilterOptions}
          onChange={setSelectedLifecycles}
        />
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

      <DataTable
        table={table}
        columnsLength={columns.length}
        emptyMessage={emptyMessage}
        minWidthClassName="min-w-[920px]"
        emptyClassName="py-8"
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
