"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Copy,
  ExternalLink,
  EyeOff,
  FolderOpen,
  Image as ImageIcon,
  KeyRound,
  Link2,
  RefreshCcw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  formatDateTime,
  formatMetadataLabel,
  formatMetadataValue,
  getAuditActorLabel,
  getAuditTargetLabel,
  getEntityDisplay,
  getEventCategory,
  getEventCategoryLabel,
  getEventTitle,
  getSecondaryLabel,
  type AuditEventCategory,
  type DashboardAuditEvent,
  type Translate,
} from "@/app/dashboard/audit/columns";
import { DetailSection } from "@/components/dashboard/DetailSheet";
import ToneBadge, {
  dashboardToneClassNames,
  type DashboardTone,
} from "@/components/dashboard/ToneBadge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AuditEventsTableProps = {
  events: DashboardAuditEvent[];
  total: number;
  page: number;
  pageCount: number;
  previousHref: string | null;
  nextHref: string | null;
};

const categoryIcons: Record<AuditEventCategory, LucideIcon> = {
  Account: ShieldCheck,
  Credentials: KeyRound,
  Projects: FolderOpen,
  Gallery: ImageIcon,
  Share: Link2,
  Privacy: EyeOff,
  System: RefreshCcw,
};

const categoryTones: Record<AuditEventCategory, DashboardTone> = {
  Account: "sky",
  Credentials: "violet",
  Projects: "emerald",
  Gallery: "amber",
  Share: "sky",
  Privacy: "neutral",
  System: "neutral",
};

const destructiveEventPattern = /\.(banned|deleted|revoked|purged)$/;

function getEventTone(eventType: string): DashboardTone {
  if (destructiveEventPattern.test(eventType)) return "rose";
  return categoryTones[getEventCategory(eventType)];
}

const changePairs = [
  ["previous", "next"],
  ["previous", "new"],
] as const;

// Turns previousX/nextX metadata pairs into before/after rows.
function splitMetadata(metadata: Record<string, unknown> | null) {
  const entries = Object.entries(metadata ?? {});
  const changes: { field: string; before: unknown; after: unknown }[] = [];
  const used = new Set<string>();
  for (const [key] of entries) {
    for (const [fromPrefix, toPrefix] of changePairs) {
      if (!key.startsWith(fromPrefix)) continue;
      const field = key.slice(fromPrefix.length);
      const toKey = `${toPrefix}${field}`;
      if (!field || !(toKey in (metadata ?? {}))) continue;
      changes.push({
        field,
        before: metadata?.[key],
        after: metadata?.[toKey],
      });
      used.add(key);
      used.add(toKey);
    }
  }
  return {
    changes,
    details: entries.filter(([key]) => !used.has(key)),
  };
}

function dayKey(value: string) {
  return new Date(value).toLocaleDateString("en-CA");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-6 shrink-0"
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
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="flex min-w-0 items-center justify-end gap-1 text-right">
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
  page,
  pageCount,
  previousHref,
  nextHref,
}: AuditEventsTableProps) {
  const t: Translate = useTranslations("dashboard.audit");
  const unknownUserLabel = t("fallback.unknownUser");
  const systemActorLabel = t("fallback.systemActor");
  const [inspectEvent, setInspectEvent] = useState<DashboardAuditEvent | null>(
    null
  );

  const [renderedAt] = useState(() => Date.now());
  const todayKey = dayKey(new Date(renderedAt).toISOString());
  const yesterdayKey = dayKey(new Date(renderedAt - 86_400_000).toISOString());
  const dayFormatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const groups: { key: string; label: string; items: DashboardAuditEvent[] }[] =
    [];
  for (const event of [...events].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  )) {
    const key = dayKey(event.createdAt);
    let group = groups.at(-1);
    if (!group || group.key !== key) {
      const formatted = dayFormatter.format(new Date(event.createdAt));
      group = {
        key,
        label:
          key === todayKey
            ? t("timeline.today", { date: formatted })
            : key === yesterdayKey
              ? t("timeline.yesterday", { date: formatted })
              : formatted,
        items: [],
      };
      groups.push(group);
    }
    group.items.push(event);
  }

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
  const metadata = inspectEvent
    ? splitMetadata(inspectEvent.metadata)
    : { changes: [], details: [] };
  const InspectIcon = inspectEvent
    ? categoryIcons[getEventCategory(inspectEvent.eventType)]
    : null;

  return (
    <div className="space-y-3">
      {events.length > 0 ? (
        <div className="overflow-hidden rounded-lg border">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h3 className="bg-muted text-muted-foreground border-b px-4 py-1.5 text-xs font-medium">
                {group.label}
              </h3>
              <ul className="divide-y border-b last:border-b-0">
                {group.items.map((event) => {
                  const Icon = categoryIcons[getEventCategory(event.eventType)];
                  const title = getEventTitle(event.eventType, t);
                  const selected = inspectEvent?.id === event.id;
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        aria-label={t("aria.inspect", { event: title })}
                        onClick={() => setInspectEvent(event)}
                        className={cn(
                          "hover:bg-muted/50 focus-visible:bg-muted/60 flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left outline-none",
                          selected &&
                            "bg-brand-primary/6 shadow-[inset_2px_0_0_var(--brand-primary)]"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex size-8 shrink-0 items-center justify-center rounded-md border-0",
                            dashboardToneClassNames[
                              getEventTone(event.eventType)
                            ]
                          )}
                        >
                          <Icon className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {title}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {getAuditActorLabel(
                              event,
                              unknownUserLabel,
                              systemActorLabel
                            )}
                            {event.target || event.targetLabel
                              ? ` → ${getAuditTargetLabel(event, unknownUserLabel)}`
                              : null}
                          </span>
                        </span>
                        <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
                          {getEventCategoryLabel(event.eventType, t)}
                        </span>
                        <time
                          dateTime={event.createdAt}
                          className="text-muted-foreground w-11 shrink-0 text-right text-xs tabular-nums"
                        >
                          {formatTime(event.createdAt)}
                        </time>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground rounded-lg border py-10 text-center text-sm">
          {t("table.noEvents")}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground flex gap-1.5 text-xs">
          <span>{t("timeline.summary", { total })}</span>
          <span aria-hidden="true">·</span>
          <span>{t("pagination.page", { page, pageCount })}</span>
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
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          {inspectEvent && InspectIcon ? (
            <>
              <SheetHeader className="border-b p-6 pr-12 text-left">
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
                      dashboardToneClassNames[
                        getEventTone(inspectEvent.eventType)
                      ]
                    )}
                  >
                    <InspectIcon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="text-base">
                      {getEventTitle(inspectEvent.eventType, t)}
                    </SheetTitle>
                    <SheetDescription className="mt-0.5">
                      {formatDateTime(inspectEvent.createdAt)}
                    </SheetDescription>
                    <div className="pt-2">
                      <ToneBadge tone="neutral">
                        {getEventCategoryLabel(inspectEvent.eventType, t)}
                      </ToneBadge>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <DetailSection title={t("detail.who")}>
                <dl className="space-y-2">
                  <DetailValue
                    label={t("table.actor")}
                    value={getAuditActorLabel(
                      inspectEvent,
                      unknownUserLabel,
                      systemActorLabel
                    )}
                  />
                  {actorSecondary ? (
                    <DetailValue
                      label={t("detail.actorContext")}
                      value={actorSecondary}
                    />
                  ) : null}
                  <DetailValue
                    label={t("detail.actorId")}
                    value={inspectEvent.actorUserId}
                    copyLabel={t("aria.copy", { label: t("detail.actorId") })}
                  />
                  <DetailValue
                    label={t("table.target")}
                    value={getAuditTargetLabel(inspectEvent, unknownUserLabel)}
                  />
                  {targetSecondary ? (
                    <DetailValue
                      label={t("detail.targetContext")}
                      value={targetSecondary}
                    />
                  ) : null}
                  <DetailValue
                    label={t("detail.targetId")}
                    value={inspectEvent.targetUserId}
                    copyLabel={t("aria.copy", { label: t("detail.targetId") })}
                  />
                </dl>
              </DetailSection>

              <DetailSection title={t("detail.whatChanged")}>
                {metadata.changes.length > 0 ? (
                  <div className="mb-3 overflow-hidden rounded-md border text-xs">
                    <div className="bg-muted text-muted-foreground grid grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)] font-medium">
                      <span className="px-2.5 py-1.5">{t("detail.field")}</span>
                      <span className="px-2.5 py-1.5">
                        {t("detail.before")}
                      </span>
                      <span className="px-2.5 py-1.5">{t("detail.after")}</span>
                    </div>
                    {metadata.changes.map((change) => (
                      <div
                        key={change.field}
                        className="grid grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)] border-t font-mono"
                      >
                        <span className="text-muted-foreground truncate px-2.5 py-1.5">
                          {formatMetadataLabel(change.field)}
                        </span>
                        <span className="text-muted-foreground px-2.5 py-1.5 break-all">
                          {formatMetadataValue(change.before)}
                        </span>
                        <span className="bg-emerald-500/8 px-2.5 py-1.5 break-all text-emerald-700 dark:text-emerald-300">
                          {formatMetadataValue(change.after)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {metadata.details.length > 0 ? (
                  <dl className="space-y-2">
                    {metadata.details.map(([key, value]) => (
                      <DetailValue
                        key={key}
                        label={formatMetadataLabel(key)}
                        value={formatMetadataValue(value)}
                      />
                    ))}
                  </dl>
                ) : metadata.changes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("detail.noMetadata")}
                  </p>
                ) : null}
              </DetailSection>

              <DetailSection title={t("detail.record")}>
                <dl className="space-y-2">
                  <DetailValue
                    label={t("detail.eventId")}
                    value={inspectEvent.id}
                    copyLabel={t("aria.copy", { label: t("detail.eventId") })}
                  />
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
              </DetailSection>

              <DetailSection className="flex flex-wrap gap-2">
                {entityHref ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={entityHref} target="_blank" prefetch={false}>
                      {t("detail.openEntity")}
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                ) : null}
                {inspectEvent.actorUserId ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/dashboard/audit?actor=${encodeURIComponent(inspectEvent.actorUserId)}&range=all`}
                      prefetch={false}
                    >
                      {t("detail.viewActorHistory")}
                    </Link>
                  </Button>
                ) : null}
                {inspectEvent.targetUserId ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/dashboard/audit?target=${encodeURIComponent(inspectEvent.targetUserId)}&range=all`}
                      prefetch={false}
                    >
                      {t("detail.viewTargetHistory")}
                    </Link>
                  </Button>
                ) : null}
                {inspectEvent.entityType === "account_lifecycle" &&
                inspectEvent.entityId ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/dashboard/audit?q=${encodeURIComponent(inspectEvent.entityId)}&range=all`}
                      prefetch={false}
                    >
                      {t("detail.viewAccountLifecycle")}
                    </Link>
                  </Button>
                ) : null}
              </DetailSection>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
