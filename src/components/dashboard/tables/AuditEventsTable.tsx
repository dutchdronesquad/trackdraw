"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type SortingState, useTable } from "@tanstack/react-table";
import { Copy, ExternalLink } from "lucide-react";
import {
  formatDateTime,
  formatMetadataLabel,
  formatMetadataValue,
  getAuditActorLabel,
  getAuditColumns,
  getAuditTargetLabel,
  getEntityDisplay,
  getEventCategoryLabel,
  getEventTitle,
  getSecondaryLabel,
  type DashboardAuditEvent,
  type Translate,
} from "@/app/dashboard/audit/columns";
import DataTable from "@/components/data-table/DataTable";
import { dataTableFeatures } from "@/components/data-table/tableFeatures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type AuditEventsTableProps = {
  events: DashboardAuditEvent[];
  total: number;
  actorCount: number;
  targetCount: number;
  page: number;
  pageCount: number;
  previousHref: string | null;
  nextHref: string | null;
};

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7"
      aria-label={label}
      onClick={() => {
        const clipboard = navigator.clipboard;
        if (!clipboard?.writeText) return;

        void clipboard.writeText(value).catch(() => undefined);
      }}
    >
      <Copy className="size-3.5" />
    </Button>
  );
}

function DetailValue({
  label,
  value,
  copyLabel,
}: {
  label: string;
  value: string | null;
  copyLabel?: string;
}) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1 text-sm">
        <span className="min-w-0 break-all">{value ?? "—"}</span>
        {value && copyLabel ? (
          <CopyButton value={value} label={copyLabel} />
        ) : null}
      </dd>
    </div>
  );
}

export default function DashboardAuditEventsTable({
  events,
  total,
  actorCount,
  targetCount,
  page,
  pageCount,
  previousHref,
  nextHref,
}: AuditEventsTableProps) {
  const t: Translate = useTranslations("dashboard.audit");
  const unknownUserLabel = t("fallback.unknownUser");
  const systemActorLabel = t("fallback.systemActor");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [inspectEvent, setInspectEvent] = useState<DashboardAuditEvent | null>(
    null
  );
  const columns = useMemo(
    () => getAuditColumns({ t, unknownUserLabel, systemActorLabel }),
    [t, unknownUserLabel, systemActorLabel]
  );
  const table = useTable({
    features: dataTableFeatures,
    data: events,
    columns,
    state: {
      sorting,
      columnVisibility: { eventCategory: false },
    },
    onSortingChange: setSorting,
  });

  const entityDisplay = inspectEvent ? getEntityDisplay(inspectEvent, t) : null;
  const actorSecondary = inspectEvent
    ? getSecondaryLabel(inspectEvent.actor)
    : null;
  const targetSecondary = inspectEvent
    ? getSecondaryLabel(inspectEvent.target)
    : null;
  const entityHref =
    inspectEvent?.entityType === "share" && inspectEvent.entityId
      ? `/share/${encodeURIComponent(inspectEvent.entityId)}`
      : null;

  return (
    <div className="space-y-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="bg-muted/50 rounded-xl p-5">
          <p className="text-muted-foreground text-sm">
            {t("stats.visibleEvents")}
          </p>
          <p className="mt-2 text-2xl font-semibold">{total}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("stats.visibleEventsHelper")}
          </p>
        </div>
        <div className="bg-muted/50 rounded-xl p-5">
          <p className="text-muted-foreground text-sm">{t("stats.actors")}</p>
          <p className="mt-2 text-2xl font-semibold">{actorCount}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("stats.actorsHelper")}
          </p>
        </div>
        <div className="bg-muted/50 rounded-xl p-5">
          <p className="text-muted-foreground text-sm">{t("stats.targets")}</p>
          <p className="mt-2 text-2xl font-semibold">{targetCount}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("stats.targetsHelper")}
          </p>
        </div>
      </div>

      <DataTable
        table={table}
        columnsLength={table.getVisibleLeafColumns().length}
        emptyMessage={t("table.noEvents")}
        minWidthClassName="min-w-[980px]"
        onRowClick={(row) => setInspectEvent(row.original)}
        getRowAriaLabel={(row) =>
          t("aria.inspect", { event: getEventTitle(row.original.eventType, t) })
        }
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {t("pagination.page", { page, pageCount })}
        </p>
        <div className="flex gap-2">
          {previousHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={previousHref} prefetch={false}>
                {t("pagination.previous")}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              {t("pagination.previous")}
            </Button>
          )}
          {nextHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={nextHref} prefetch={false}>
                {t("pagination.next")}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              {t("pagination.next")}
            </Button>
          )}
        </div>
      </div>

      <Sheet
        open={Boolean(inspectEvent)}
        onOpenChange={(open) => {
          if (!open) setInspectEvent(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {inspectEvent ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 pr-8">
                  <Badge variant="outline">
                    {getEventCategoryLabel(inspectEvent.eventType, t)}
                  </Badge>
                </div>
                <SheetTitle>
                  {getEventTitle(inspectEvent.eventType, t)}
                </SheetTitle>
                <SheetDescription>
                  {formatDateTime(inspectEvent.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <dl className="mt-6">
                <DetailValue
                  label={t("detail.eventId")}
                  value={inspectEvent.id}
                  copyLabel={t("aria.copy", { label: t("detail.eventId") })}
                />
                <DetailValue
                  label={t("table.actor")}
                  value={getAuditActorLabel(
                    inspectEvent,
                    unknownUserLabel,
                    systemActorLabel
                  )}
                />
                <DetailValue
                  label={t("detail.actorId")}
                  value={inspectEvent.actorUserId}
                  copyLabel={t("aria.copy", { label: t("detail.actorId") })}
                />
                {actorSecondary ? (
                  <DetailValue
                    label={t("detail.actorContext")}
                    value={actorSecondary}
                  />
                ) : null}
                <DetailValue
                  label={t("table.target")}
                  value={getAuditTargetLabel(inspectEvent, unknownUserLabel)}
                />
                <DetailValue
                  label={t("detail.targetId")}
                  value={inspectEvent.targetUserId}
                  copyLabel={t("aria.copy", { label: t("detail.targetId") })}
                />
                {targetSecondary ? (
                  <DetailValue
                    label={t("detail.targetContext")}
                    value={targetSecondary}
                  />
                ) : null}
                <DetailValue
                  label={t("table.entity")}
                  value={entityDisplay?.label ?? null}
                />
                <DetailValue
                  label={t("detail.entityId")}
                  value={inspectEvent.entityId}
                  copyLabel={t("aria.copy", { label: t("detail.entityId") })}
                />
              </dl>

              {entityHref ? (
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={entityHref} target="_blank" prefetch={false}>
                    {t("detail.openEntity")}
                    <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              ) : null}

              {inspectEvent.actorUserId || inspectEvent.targetUserId ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {inspectEvent.actorUserId ? (
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/dashboard/audit?actor=${encodeURIComponent(inspectEvent.actorUserId)}&range=all`}
                        prefetch={false}
                      >
                        {t("detail.viewActorHistory")}
                      </Link>
                    </Button>
                  ) : null}
                  {inspectEvent.targetUserId ? (
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/dashboard/audit?target=${encodeURIComponent(inspectEvent.targetUserId)}&range=all`}
                        prefetch={false}
                      >
                        {t("detail.viewTargetHistory")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-8">
                <h3 className="text-sm font-semibold">{t("table.details")}</h3>
                {Object.entries(inspectEvent.metadata ?? {}).length > 0 ? (
                  <dl className="mt-2 rounded-lg border px-3">
                    {Object.entries(inspectEvent.metadata ?? {}).map(
                      ([key, value]) => (
                        <DetailValue
                          key={key}
                          label={formatMetadataLabel(key)}
                          value={formatMetadataValue(value)}
                        />
                      )
                    )}
                  </dl>
                ) : (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {t("detail.noMetadata")}
                  </p>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
