import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import DashboardAuditEventsTable from "@/components/dashboard/tables/AuditEventsTable";
import DashboardPageIntro from "@/components/dashboard/PageIntro";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  auditEventCategories,
  auditEventTitleKeys,
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
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
}

function rangeStart(range: AuditRange) {
  if (range === "all" || range === "custom") return undefined;
  const hours = range === "24h" ? 24 : Number.parseInt(range, 10) * 24;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function userOptionLabel(
  user: { name: string | null; email: string | null },
  unknownUserLabel: string
) {
  const name = user.name?.trim();
  const email = user.email?.trim();
  if (name && email) return `${name} (${email})`;
  return name || email || unknownUserLabel;
}

function pageHref(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `/dashboard/audit?${next.toString()}`;
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
  const range = parseRange(firstValue(resolvedSearchParams.range));
  const customFrom = firstValue(resolvedSearchParams.from);
  const customTo = firstValue(resolvedSearchParams.to);
  const requestedPage = Number.parseInt(
    firstValue(resolvedSearchParams.page) ?? "1",
    10
  );
  const eventType = firstValue(resolvedSearchParams.event)?.trim();
  const actorUserId = firstValue(resolvedSearchParams.actor)?.trim();
  const targetUserId = firstValue(resolvedSearchParams.target)?.trim();
  const search = firstValue(resolvedSearchParams.q)?.trim();
  const [result, facets] = await Promise.all([
    queryAuditEvents({
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
      pageSize: 25,
      category,
      eventTypes: eventType ? [eventType] : undefined,
      actorUserId: actorUserId || undefined,
      targetUserId: targetUserId || undefined,
      search: search || undefined,
      from:
        range === "custom"
          ? dateBoundary(customFrom, false)
          : rangeStart(range),
      to: range === "custom" ? dateBoundary(customTo, true) : undefined,
    }),
    listAuditEventFacets(),
  ]);
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const currentParams = new URLSearchParams();
  if (search) currentParams.set("q", search);
  if (category) currentParams.set("category", category);
  if (eventType) currentParams.set("event", eventType);
  if (actorUserId) currentParams.set("actor", actorUserId);
  if (targetUserId) currentParams.set("target", targetUserId);
  currentParams.set("range", range);
  if (customFrom) currentParams.set("from", customFrom);
  if (customTo) currentParams.set("to", customTo);
  const selectClassName =
    "border-input bg-background h-9 rounded-lg border px-3 text-sm shadow-none";

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
        <form
          action="/dashboard/audit"
          method="get"
          className="bg-muted/30 grid gap-3 rounded-xl p-4 lg:grid-cols-12"
        >
          <Input
            type="search"
            name="q"
            defaultValue={search}
            placeholder={t("audit.filters.searchPlaceholder")}
            className="lg:col-span-4"
          />
          <select
            name="range"
            defaultValue={range}
            aria-label={t("audit.filters.range")}
            className={`${selectClassName} lg:col-span-2`}
          >
            {(["24h", "7d", "30d", "90d", "all", "custom"] as const).map(
              (value) => (
                <option key={value} value={value}>
                  {t(`audit.rangeValues.${value}`)}
                </option>
              )
            )}
          </select>
          <select
            name="category"
            defaultValue={category ?? ""}
            aria-label={t("audit.filters.category")}
            className={`${selectClassName} lg:col-span-2`}
          >
            <option value="">{t("audit.filters.allCategories")}</option>
            {auditEventCategories.map((value) => (
              <option key={value} value={value}>
                {t(`audit.categoryValues.${value}`)}
              </option>
            ))}
          </select>
          <select
            name="event"
            defaultValue={eventType ?? ""}
            aria-label={t("audit.filters.event")}
            className={`${selectClassName} lg:col-span-2`}
          >
            <option value="">{t("audit.filters.allEvents")}</option>
            {facets.eventTypes.map((value) => (
              <option key={value} value={value}>
                {auditEventTitleKeys[value]
                  ? t(`audit.eventTitles.${auditEventTitleKeys[value]}`)
                  : value}
              </option>
            ))}
          </select>
          <select
            name="actor"
            defaultValue={actorUserId ?? ""}
            aria-label={t("audit.filters.actor")}
            className={`${selectClassName} lg:col-span-2`}
          >
            <option value="">{t("audit.filters.allActors")}</option>
            {facets.actors.map((user) => (
              <option key={user.id} value={user.id}>
                {userOptionLabel(user, t("audit.fallback.unknownUser"))}
              </option>
            ))}
          </select>
          <select
            name="target"
            defaultValue={targetUserId ?? ""}
            aria-label={t("audit.filters.target")}
            className={`${selectClassName} lg:col-span-3`}
          >
            <option value="">{t("audit.filters.allTargets")}</option>
            {facets.targets.map((user) => (
              <option key={user.id} value={user.id}>
                {userOptionLabel(user, t("audit.fallback.unknownUser"))}
              </option>
            ))}
          </select>
          <Input
            type="date"
            name="from"
            defaultValue={customFrom}
            aria-label={t("audit.filters.from")}
            className="lg:col-span-2"
          />
          <Input
            type="date"
            name="to"
            defaultValue={customTo}
            aria-label={t("audit.filters.to")}
            className="lg:col-span-2"
          />
          <div className="flex gap-2 lg:col-span-5 lg:justify-end">
            <Button type="submit" size="sm">
              {t("audit.filters.apply")}
            </Button>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/dashboard/audit" prefetch={false}>
                {t("audit.filters.reset")}
              </Link>
            </Button>
          </div>
        </form>
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
