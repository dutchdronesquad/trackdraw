import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Bell } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import AuditFilters from "@/components/dashboard/AuditFilters";
import DashboardAuditEventsTable from "@/components/dashboard/tables/AuditEventsTable";
import DashboardPageIntro from "@/components/dashboard/PageIntro";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import {
  auditEventCategories,
  auditEventTitleKeys,
  getAuditEventCategory,
  type AuditEventCategory,
} from "@/lib/audit-events";
import { listAuditEventFacets, queryAuditEvents } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return {
    title: `${tCommon("labels.dashboard")} ${t("pages.audit")}`,
    robots: { index: false, follow: false },
  };
}

type AuditRange = "24h" | "7d" | "30d" | "90d" | "all" | "custom";

const allFilterValue = "__all__";

type AuditSearchParams = {
  q?: string | string[];
  category?: string | string[];
  event?: string | string[];
  actor?: string | string[];
  target?: string | string[];
  range?: string | string[];
  from?: string | string[];
  to?: string | string[];
  page?: string | string[];
  type?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function filterValue(value: string | undefined) {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue !== allFilterValue
    ? normalizedValue
    : undefined;
}

function identityFilterValue(value: string | undefined) {
  const normalizedValue = filterValue(value);
  if (!normalizedValue) return undefined;
  return normalizedValue.includes(":")
    ? normalizedValue
    : `user:${normalizedValue}`;
}

function parseCategory(value: string | undefined) {
  return auditEventCategories.includes(value as AuditEventCategory)
    ? (value as AuditEventCategory)
    : undefined;
}

function parseRange(value: string | undefined): AuditRange {
  if (
    value === "24h" ||
    value === "7d" ||
    value === "30d" ||
    value === "90d" ||
    value === "all" ||
    value === "custom"
  ) {
    return value;
  }
  return "30d";
}

function dateBoundary(value: string | undefined, endOfDay: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return undefined;
  }
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
}

function rangeStart(range: AuditRange) {
  if (range === "all" || range === "custom") return undefined;
  const hours = range === "24h" ? 24 : Number.parseInt(range, 10) * 24;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function formatUnknownEventType(eventType: string) {
  return eventType
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" · ");
}

function pageHref(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `/dashboard/audit?${next.toString()}`;
}

function clearFilterHref(params: URLSearchParams, keys: string[]) {
  const next = new URLSearchParams(params);
  keys.forEach((key) => next.delete(key));
  if (next.get("range") === "30d") next.delete("range");
  const query = next.toString();
  return query ? `/dashboard/audit?${query}` : "/dashboard/audit";
}

export default async function DashboardAuditPage({
  searchParams,
}: {
  searchParams?: Promise<AuditSearchParams>;
}) {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "audit.read")) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const legacyType = firstValue(resolvedSearchParams.type);
  const category =
    parseCategory(firstValue(resolvedSearchParams.category)) ??
    (legacyType === "account"
      ? "Account"
      : legacyType === "gallery"
        ? "Gallery"
        : undefined);
  const requestedRange = parseRange(firstValue(resolvedSearchParams.range));
  const requestedFrom = firstValue(resolvedSearchParams.from);
  const requestedTo = firstValue(resolvedSearchParams.to);
  const validCustomRange =
    requestedRange === "custom" &&
    Boolean(dateBoundary(requestedFrom, false)) &&
    Boolean(dateBoundary(requestedTo, true)) &&
    requestedFrom! <= requestedTo!;
  const range =
    requestedRange === "custom" && !validCustomRange ? "30d" : requestedRange;
  const customFrom = range === "custom" ? requestedFrom : undefined;
  const customTo = range === "custom" ? requestedTo : undefined;
  const requestedPage = Number.parseInt(
    firstValue(resolvedSearchParams.page) ?? "1",
    10
  );
  const eventType = filterValue(firstValue(resolvedSearchParams.event));
  const actor = identityFilterValue(firstValue(resolvedSearchParams.actor));
  const target = identityFilterValue(firstValue(resolvedSearchParams.target));
  const search = firstValue(resolvedSearchParams.q)?.trim();
  const from =
    range === "custom" ? dateBoundary(customFrom, false) : rangeStart(range);
  const to = range === "custom" ? dateBoundary(customTo, true) : undefined;
  const [result, facets] = await Promise.all([
    queryAuditEvents({
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
      pageSize: 25,
      category,
      eventTypes: eventType ? [eventType] : undefined,
      actor,
      target,
      search: search || undefined,
      from,
      to,
    }),
    listAuditEventFacets({ category, from, to }),
  ]);
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const currentParams = new URLSearchParams();
  if (search) currentParams.set("q", search);
  if (category) currentParams.set("category", category);
  if (eventType) currentParams.set("event", eventType);
  if (actor) currentParams.set("actor", actor);
  if (target) currentParams.set("target", target);
  currentParams.set("range", range);
  if (range === "custom" && customFrom && customTo) {
    currentParams.set("from", customFrom);
    currentParams.set("to", customTo);
  }
  const availableCategories = new Set(
    facets.eventTypes.map(getAuditEventCategory)
  );
  const eventOptions = facets.eventTypes.map((value) => ({
    value,
    label: auditEventTitleKeys[value]
      ? t(`audit.eventTitles.${auditEventTitleKeys[value]}`)
      : formatUnknownEventType(value),
    category: getAuditEventCategory(value),
  }));
  const actorOptions = facets.actors.map((identity) => ({
    value: identity.value,
    label:
      identity.email && identity.email !== identity.label
        ? `${identity.label} (${identity.email})`
        : identity.label === "system"
          ? t("audit.fallback.systemActor")
          : identity.label,
    group: t(`audit.filters.identityGroups.${identity.kind}`),
  }));
  const targetOptions = facets.targets.map((identity) => ({
    value: identity.value,
    label:
      identity.email && identity.email !== identity.label
        ? `${identity.label} (${identity.email})`
        : identity.label,
    group: t(`audit.filters.identityGroups.${identity.kind}`),
  }));
  const activeFilters = [
    search
      ? {
          key: "search",
          label: `${t("audit.filters.search")}: ${search}`,
          href: clearFilterHref(currentParams, ["q"]),
        }
      : null,
    range !== "30d"
      ? {
          key: "range",
          label:
            range === "custom" && customFrom && customTo
              ? `${customFrom} – ${customTo}`
              : t(`audit.rangeValues.${range}`),
          href: clearFilterHref(currentParams, ["range", "from", "to"]),
        }
      : null,
    category
      ? {
          key: "category",
          label: t(`audit.categoryValues.${category}`),
          href: clearFilterHref(currentParams, ["category", "event"]),
        }
      : null,
    eventType
      ? {
          key: "event",
          label:
            eventOptions.find((option) => option.value === eventType)?.label ??
            formatUnknownEventType(eventType),
          href: clearFilterHref(currentParams, ["event"]),
        }
      : null,
    actor
      ? {
          key: "actor",
          label: `${t("audit.filters.actor")}: ${actorOptions.find((option) => option.value === actor)?.label ?? t("audit.filters.unavailableSelection")}`,
          href: clearFilterHref(currentParams, ["actor"]),
        }
      : null,
    target
      ? {
          key: "target",
          label: `${t("audit.filters.target")}: ${targetOptions.find((option) => option.value === target)?.label ?? t("audit.filters.unavailableSelection")}`,
          href: clearFilterHref(currentParams, ["target"]),
        }
      : null,
  ].filter((filter): filter is NonNullable<typeof filter> => filter !== null);
  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.audit")}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <DashboardPageIntro
          icon={Bell}
          title={t("pages.audit")}
          description={t("pages.auditIntro")}
          accent="bg-rose-500/10 text-rose-600 dark:text-rose-400"
        />
        <AuditFilters
          key={currentParams.toString()}
          values={{
            search,
            range,
            category: category ?? allFilterValue,
            event: eventType ?? allFilterValue,
            actor: actor ?? allFilterValue,
            target: target ?? allFilterValue,
            from: customFrom,
            to: customTo,
          }}
          labels={{
            title: t("audit.filters.title"),
            search: t("audit.filters.search"),
            searchPlaceholder: t("audit.filters.searchPlaceholder"),
            range: t("audit.filters.range"),
            category: t("audit.filters.category"),
            event: t("audit.filters.event"),
            actor: t("audit.filters.actor"),
            target: t("audit.filters.target"),
            dateRange: t("audit.filters.dateRange"),
            chooseDates: t("audit.filters.chooseDates"),
            clearDates: t("audit.filters.clearDates"),
            applyDateRange: t("audit.filters.applyDateRange"),
            clearAll: t("audit.filters.clearAll"),
            moreFilters: t("audit.filters.moreFilters"),
            filterDetails: t("audit.filters.filterDetails"),
            searchOptions: t("audit.filters.searchOptions"),
            noOptions: t("audit.filters.noOptions"),
            removeFilter: t("audit.filters.removeFilter"),
          }}
          rangeOptions={(
            ["24h", "7d", "30d", "90d", "all", "custom"] as const
          ).map((value) => ({
            value,
            label: t(`audit.rangeValues.${value}`),
          }))}
          categoryOptions={[
            {
              value: allFilterValue,
              label: t("audit.filters.allCategories"),
            },
            ...auditEventCategories
              .filter(
                (value) => availableCategories.has(value) || value === category
              )
              .map((value) => ({
                value,
                label: t(`audit.categoryValues.${value}`),
              })),
          ]}
          eventOptions={[
            { value: allFilterValue, label: t("audit.filters.allEvents") },
            ...eventOptions,
          ]}
          actorOptions={[
            { value: allFilterValue, label: t("audit.filters.allActors") },
            ...actorOptions,
            ...(actor && !actorOptions.some((option) => option.value === actor)
              ? [
                  {
                    value: actor,
                    label: t("audit.filters.unavailableSelection"),
                  },
                ]
              : []),
          ]}
          targetOptions={[
            { value: allFilterValue, label: t("audit.filters.allTargets") },
            ...targetOptions,
            ...(target &&
            !targetOptions.some((option) => option.value === target)
              ? [
                  {
                    value: target,
                    label: t("audit.filters.unavailableSelection"),
                  },
                ]
              : []),
          ]}
          activeFilters={activeFilters}
          locale={locale}
        />
        <DashboardAuditEventsTable
          events={result.events}
          total={result.total}
          actorCount={result.actorCount}
          targetCount={result.targetCount}
          page={result.page}
          pageCount={result.pageCount}
          previousHref={
            result.page > 1 ? pageHref(currentParams, result.page - 1) : null
          }
          nextHref={
            result.page < result.pageCount
              ? pageHref(currentParams, result.page + 1)
              : null
          }
        />
      </div>
    </>
  );
}
