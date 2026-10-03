"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { type SortingState, useTable } from "@tanstack/react-table";
import { Ban, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatDateTime,
  getApiKeyStatus,
  getApiKeysColumns,
  getKeyLabel,
  getOwnerLabel,
  getRateLimitUsage,
  getStatusLabel,
  getStatusTone,
  isExpiringSoon,
  NEAR_RATE_LIMIT,
  type Translate,
} from "@/app/dashboard/api-keys/columns";
import {
  DangerAction,
  DetailList,
  DetailNotice,
  DetailSection,
  DetailStats,
} from "@/components/dashboard/DetailSheet";
import StatusFilter from "@/components/dashboard/StatusFilter";
import ToneBadge from "@/components/dashboard/ToneBadge";
import UserAvatar from "@/components/UserAvatar";
import DataTable from "@/components/data-table/DataTable";
import DataTableToolbar from "@/components/data-table/DataTableToolbar";
import { dataTableFeatures } from "@/components/data-table/tableFeatures";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AdminApiKey } from "@/lib/server/api-keys";
import { cn } from "@/lib/utils";

type ApiKeySegment =
  "all" | "active" | "nearLimit" | "expiring" | "neverUsed" | "inactive";

const segmentFilters: Record<ApiKeySegment, (key: AdminApiKey) => boolean> = {
  all: () => true,
  active: (key) => getApiKeyStatus(key) === "active",
  nearLimit: (key) =>
    getApiKeyStatus(key) === "active" &&
    (getRateLimitUsage(key) ?? 0) >= NEAR_RATE_LIMIT,
  expiring: (key) => getApiKeyStatus(key) === "active" && isExpiringSoon(key),
  neverUsed: (key) =>
    getApiKeyStatus(key) === "active" && key.lastRequest === null,
  inactive: (key) => getApiKeyStatus(key) !== "active",
};

function formatRateLimitWindow(
  ms: number | null,
  t: (key: string, values?: Record<string, unknown>) => string
) {
  if (ms === null) return "—";
  const minutes = ms / 1000 / 60;
  if (minutes < 60) return t("units.minutes", { count: minutes });
  return t("units.hours", { count: minutes / 60 });
}

function formatPermissions(permissions: AdminApiKey["permissions"]) {
  if (!permissions) return "—";
  return Object.entries(permissions)
    .map(([resource, actions]) => `${resource}: ${actions.join(", ")}`)
    .join(" · ");
}

type DashboardApiKeysManagerProps = {
  initialKeys: AdminApiKey[];
  canRevoke?: boolean;
};

export default function DashboardApiKeysManager({
  initialKeys,
  canRevoke = false,
}: DashboardApiKeysManagerProps) {
  const t = useTranslations("dashboard.apiKeys");
  const translate = t as unknown as Translate;
  const isMobile = useIsMobile();
  const [keys, setKeys] = useState(initialKeys);
  const [segment, setSegment] = useState<ApiKeySegment>("all");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [inspectKey, setInspectKey] = useState<AdminApiKey | null>(null);
  const [revokeCandidate, setRevokeCandidate] = useState<AdminApiKey | null>(
    null
  );
  const [revoking, setRevoking] = useState(false);

  const columns = useMemo(
    () => getApiKeysColumns({ t: translate }),
    [translate]
  );
  const segmentedKeys = useMemo(
    () => keys.filter(segmentFilters[segment]),
    [keys, segment]
  );

  const table = useTable({
    features: dataTableFeatures,
    data: segmentedKeys,
    columns,
    state: { globalFilter, sorting },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const key = row.original;
      const q = filterValue.toLowerCase();
      return (
        (key.name?.toLowerCase().includes(q) ?? false) ||
        (key.start?.toLowerCase().includes(q) ?? false) ||
        (key.ownerName?.toLowerCase().includes(q) ?? false) ||
        (key.ownerEmail?.toLowerCase().includes(q) ?? false) ||
        key.ownerUserId.toLowerCase().includes(q)
      );
    },
  });

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const count = (value: ApiKeySegment) =>
    keys.filter(segmentFilters[value]).length;
  const hasFilters = globalFilter.trim() !== "" || segment !== "all";
  const clearFilters = () => {
    setGlobalFilter("");
    setSegment("all");
  };
  const emptyState = hasFilters ? (
    <div className="flex flex-col items-center gap-2 py-6 whitespace-normal">
      <span className="bg-muted text-muted-foreground inline-flex size-10 items-center justify-center rounded-lg">
        <Search className="size-4" aria-hidden="true" />
      </span>
      <p className="text-foreground text-sm font-medium">
        {t("empty.filtered")}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={clearFilters}
      >
        {t("filters.clear")}
      </Button>
    </div>
  ) : (
    t("empty.default")
  );

  const inspectStatus = inspectKey ? getApiKeyStatus(inspectKey) : null;
  const inspectUsage = inspectKey ? getRateLimitUsage(inspectKey) : null;
  const inspectNearLimit =
    inspectUsage !== null && inspectUsage >= NEAR_RATE_LIMIT;
  const visibleRows = table.getRowModel().rows;

  const submitRevoke = async (key: AdminApiKey) => {
    setRevoking(true);
    try {
      const response = await fetch(
        `/api/dashboard/api-keys/${encodeURIComponent(key.id)}`,
        { method: "DELETE" }
      );
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? t("revokeDialog.failed"));
      }
      setKeys((prev) => prev.filter((item) => item.id !== key.id));
      setRevokeCandidate(null);
      setInspectKey(null);
      toast.success(t("revokeDialog.success", { name: getKeyLabel(key) }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("revokeDialog.failed")
      );
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-4">
      <StatusFilter
        label={t("segments.label")}
        value={segment}
        onChange={setSegment}
        items={[
          { value: "all", label: t("segments.all"), count: count("all") },
          {
            value: "active",
            label: t("segments.active"),
            count: count("active"),
          },
          {
            value: "nearLimit",
            label: t("segments.nearLimit"),
            count: count("nearLimit"),
            attention: true,
          },
          {
            value: "expiring",
            label: t("segments.expiring"),
            count: count("expiring"),
            attention: true,
          },
          {
            value: "neverUsed",
            label: t("segments.neverUsed"),
            count: count("neverUsed"),
          },
          {
            value: "inactive",
            label: t("segments.inactive"),
            count: count("inactive"),
          },
        ]}
      />

      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={t("filters.searchPlaceholder")}
      />

      {isMobile ? (
        <ul className="divide-y overflow-hidden rounded-lg border">
          {visibleRows.length > 0 ? (
            visibleRows.map((row) => {
              const key = row.original;
              const status = getApiKeyStatus(key);
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setInspectKey(key)}
                    className="hover:bg-muted/50 flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {getKeyLabel(key)}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {getOwnerLabel(key)}
                      </span>
                    </span>
                    <ToneBadge tone={getStatusTone(status)}>
                      {getStatusLabel(status, translate)}
                    </ToneBadge>
                  </button>
                </li>
              );
            })
          ) : (
            <li className="text-muted-foreground px-4 py-6 text-center text-sm">
              {emptyState}
            </li>
          )}
        </ul>
      ) : null}

      <DataTable
        table={table}
        columnsLength={columns.length}
        emptyMessage={emptyState}
        minWidthClassName="min-w-[860px]"
        wrapperClassName={isMobile ? "hidden" : undefined}
        onRowClick={(row) => setInspectKey(row.original)}
        pagination={{
          summary: (
            <p className="text-muted-foreground text-xs">
              {t("status.showing", {
                filtered: filteredRowCount,
                total: keys.length,
              })}
            </p>
          ),
        }}
      />

      <Sheet
        open={inspectKey !== null}
        onOpenChange={(open) => {
          if (!open) setInspectKey(null);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          {inspectKey && inspectStatus ? (
            <>
              <SheetHeader className="border-b p-6 pr-12 text-left">
                <SheetTitle className="truncate text-base">
                  {getKeyLabel(inspectKey)}
                </SheetTitle>
                <SheetDescription className="truncate font-mono text-xs">
                  {inspectKey.prefix ?? ""}
                  {inspectKey.start ?? ""}…
                </SheetDescription>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <ToneBadge tone={getStatusTone(inspectStatus)}>
                    {getStatusLabel(inspectStatus, translate)}
                  </ToneBadge>
                  {inspectNearLimit ? (
                    <ToneBadge tone="destructive">
                      {t("panel.badges.nearLimit", {
                        percent: Math.round((inspectUsage ?? 0) * 100),
                      })}
                    </ToneBadge>
                  ) : null}
                  {isExpiringSoon(inspectKey) ? (
                    <ToneBadge tone="amber">
                      {t("panel.badges.expiring", {
                        date: formatDate(inspectKey.expiresAt),
                      })}
                    </ToneBadge>
                  ) : null}
                </div>
              </SheetHeader>

              {inspectNearLimit ? (
                <DetailNotice tone="destructive">
                  {t("panel.messages.nearLimit")}
                </DetailNotice>
              ) : null}

              <DetailStats
                items={[
                  {
                    label: t("panel.stats.windowRequests"),
                    value: inspectKey.requestCount.toLocaleString(),
                  },
                  {
                    label: t("panel.stats.remaining"),
                    value:
                      inspectKey.remaining !== null
                        ? inspectKey.remaining.toLocaleString()
                        : "—",
                  },
                  {
                    label: t("panel.stats.rateLimit"),
                    value: inspectKey.rateLimitEnabled
                      ? `${inspectKey.rateLimitMax ?? "—"}/${formatRateLimitWindow(inspectKey.rateLimitTimeWindowMs, translate)}`
                      : t("status.off"),
                  },
                ]}
              />

              <DetailSection title={t("panel.sections.key")}>
                <DetailList
                  items={[
                    {
                      label: t("panel.fields.permissions"),
                      value: (
                        <span className="text-xs">
                          {formatPermissions(inspectKey.permissions)}
                        </span>
                      ),
                    },
                    {
                      label: t("panel.fields.created"),
                      value: formatDate(inspectKey.createdAt),
                    },
                    {
                      label: t("panel.fields.expires"),
                      value: formatDate(inspectKey.expiresAt),
                      className: cn(
                        isExpiringSoon(inspectKey) &&
                          "font-medium text-amber-700 dark:text-amber-300"
                      ),
                    },
                    {
                      label: t("panel.fields.lastUsed"),
                      value: formatDateTime(inspectKey.lastRequest),
                    },
                  ]}
                />
              </DetailSection>

              <DetailSection title={t("panel.sections.owner")}>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={inspectKey.ownerName}
                    email={inspectKey.ownerEmail}
                    className="size-8 text-xs"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {getOwnerLabel(inspectKey)}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {inspectKey.ownerEmail ?? inspectKey.ownerUserId}
                    </p>
                  </div>
                </div>
              </DetailSection>

              {canRevoke ? (
                <DetailSection>
                  <DangerAction
                    description={t("panel.messages.revokeDescription")}
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 shrink-0 gap-1.5 px-2.5 text-xs shadow-none"
                        onClick={() => setRevokeCandidate(inspectKey)}
                      >
                        <Ban className="size-3.5" />
                        {t("panel.actions.revoke")}
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
                name: revokeCandidate ? getKeyLabel(revokeCandidate) : "",
                strong: (chunks) => (
                  <span className="text-foreground font-medium">{chunks}</span>
                ),
              })}
            </DialogDescription>
          </DialogHeader>
          {revokeCandidate ? (
            <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-md border p-3 text-sm">
              <dt className="text-muted-foreground">
                {t("revokeDialog.owner")}
              </dt>
              <dd className="truncate">{getOwnerLabel(revokeCandidate)}</dd>
              <dt className="text-muted-foreground">
                {t("revokeDialog.lastUsed")}
              </dt>
              <dd>{formatDateTime(revokeCandidate.lastRequest)}</dd>
            </dl>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("revokeDialog.cancel")}</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={!revokeCandidate || revoking}
              onClick={() => {
                if (revokeCandidate) void submitRevoke(revokeCandidate);
              }}
            >
              {revoking ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("revokeDialog.revoking")}
                </>
              ) : (
                t("revokeDialog.confirm")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
