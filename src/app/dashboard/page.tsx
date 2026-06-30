import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  Eye,
  EyeOff,
  FolderOpen,
  ImageIcon,
  KeyRound,
  Link2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Reveal, RevealListItem } from "@/components/motion/Reveal";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { listAuditEvents, type AuditEvent } from "@/lib/server/audit";
import {
  getGalleryOverviewStats,
  listGalleryEntriesForDashboard,
  type DashboardGalleryEntry,
} from "@/lib/server/gallery";
import { getOverviewStats, type RecentUser } from "@/lib/server/metrics";

// --- Helpers ---

function formatRelativeTime(
  dateStr: string,
  t: (key: string, values: Record<string, number>) => string
): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return t("relativeTime.minutes", { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("relativeTime.hours", { count: hrs });
  const days = Math.floor(hrs / 24);
  return t("relativeTime.days", { count: days });
}

function actorLabel(actor: AuditEvent["actor"], systemLabel: string): string {
  if (actor?.name) return actor.name;
  if (actor?.email) return actor.email;
  return systemLabel;
}

// --- Event type config ---

type EventConfig = { icon: LucideIcon; labelKey: string; tone: string };

const EVENT_CONFIG: Record<string, EventConfig> = {
  "account.role.changed": {
    icon: ShieldCheck,
    labelKey: "accountRoleChanged",
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  "api_key.created": {
    icon: KeyRound,
    labelKey: "apiKeyCreated",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "api_key.revoked": {
    icon: KeyRound,
    labelKey: "apiKeyRevoked",
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  "gallery.entry.featured": {
    icon: Sparkles,
    labelKey: "galleryEntryFeatured",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "gallery.entry.unfeatured": {
    icon: Sparkles,
    labelKey: "galleryEntryUnfeatured",
    tone: "bg-muted text-muted-foreground",
  },
  "gallery.entry.hidden": {
    icon: EyeOff,
    labelKey: "galleryEntryHidden",
    tone: "bg-muted text-muted-foreground",
  },
  "gallery.entry.restored": {
    icon: Eye,
    labelKey: "galleryEntryRestored",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "gallery.entry.deleted": {
    icon: Trash2,
    labelKey: "galleryEntryDeleted",
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
};

const DEFAULT_EVENT_CONFIG: EventConfig = {
  icon: TrendingUp,
  labelKey: "",
  tone: "bg-muted text-muted-foreground",
};

function eventConfig(eventType: string): EventConfig {
  return EVENT_CONFIG[eventType] ?? DEFAULT_EVENT_CONFIG;
}

function humanEventLabel(
  eventType: string,
  t: (key: string) => string
): string {
  const cfg = EVENT_CONFIG[eventType];
  if (cfg) return t(`events.${cfg.labelKey}`);
  return eventType.replace(/[._]/g, " ");
}

// --- Components ---

function KpiTrend({
  current,
  previous,
  vsPrevMonthLabel,
}: {
  current: number;
  previous: number;
  vsPrevMonthLabel: string;
}) {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}
    >
      <Icon className="size-3" />
      {up ? "+" : ""}
      {pct}% {vsPrevMonthLabel}
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  trend,
  vsPrevMonthLabel,
  icon: Icon,
  accent,
  iconTone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  trend?: { current: number; previous: number };
  vsPrevMonthLabel?: string;
  icon: LucideIcon;
  accent: string;
  iconTone: string;
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className={`h-1 ${accent}`} />
      <div className="flex items-start gap-3 p-4">
        <span
          className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${iconTone}`}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs font-medium">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl leading-tight font-bold tabular-nums">
              {value}
            </p>
            {trend ? (
              <KpiTrend
                current={trend.current}
                previous={trend.previous}
                vsPrevMonthLabel={vsPrevMonthLabel ?? ""}
              />
            ) : null}
          </div>
          {sub ? (
            <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RecentAuditEvents({
  events,
  t,
}: {
  events: AuditEvent[];
  t: (key: string, values?: Record<string, unknown>) => string;
}) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs">
        {t("empty.recentActivity")}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {events.map((event, index) => {
        const cfg = eventConfig(event.eventType);
        const Icon = cfg.icon;
        return (
          <RevealListItem
            key={event.id}
            className="flex items-start gap-3 py-2.5"
            delay={index * 0.03}
          >
            <span
              className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md ${cfg.tone}`}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {actorLabel(event.actor, t("events.system"))}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {humanEventLabel(event.eventType, t)}
              </p>
            </div>
            <time className="text-muted-foreground mt-0.5 shrink-0 text-xs tabular-nums">
              {formatRelativeTime(event.createdAt, t)}
            </time>
          </RevealListItem>
        );
      })}
    </ul>
  );
}

function RecentSignups({
  users,
  t,
}: {
  users: RecentUser[];
  t: (key: string, values?: Record<string, unknown>) => string;
}) {
  if (users.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs">
        {t("empty.recentSignups")}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {users.map((user, index) => {
        const initial = (user.name ?? user.email)[0]?.toUpperCase() ?? "?";
        return (
          <RevealListItem
            key={user.id}
            className="flex items-center gap-3 py-2.5"
            delay={index * 0.03}
          >
            <span className="bg-muted text-muted-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user.name ?? user.email}
              </p>
              {user.name ? (
                <p className="text-muted-foreground truncate text-xs">
                  {user.email}
                </p>
              ) : null}
            </div>
            <time className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {formatRelativeTime(user.createdAt, t)}
            </time>
          </RevealListItem>
        );
      })}
    </ul>
  );
}

const GALLERY_STATE_BADGE: Record<
  string,
  { labelKey: string; className: string }
> = {
  featured: {
    labelKey: "featured",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  hidden: {
    labelKey: "hidden",
    className: "bg-muted text-muted-foreground",
  },
  listed: {
    labelKey: "listed",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
};

function RecentGalleryEntries({
  entries,
  t,
}: {
  entries: DashboardGalleryEntry[];
  t: (key: string, values?: Record<string, unknown>) => string;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs">
        {t("empty.galleryEntries")}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((entry, index) => {
        const badge =
          GALLERY_STATE_BADGE[entry.galleryState] ??
          GALLERY_STATE_BADGE["listed"]!;
        return (
          <RevealListItem
            key={entry.id}
            className="flex items-center gap-3 py-2.5"
            delay={index * 0.03}
          >
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
              <ImageIcon className="text-muted-foreground size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {entry.galleryTitle ||
                  entry.shareTitle ||
                  t("fallback.untitled")}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {entry.ownerName ??
                  entry.ownerEmail ??
                  t("fallback.unknownOwner")}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
            >
              {t(`galleryState.${badge.labelKey}`)}
            </span>
          </RevealListItem>
        );
      })}
    </ul>
  );
}

// --- Page ---

export default async function DashboardPage() {
  const requestHeaders = new Headers(await headers());
  const actor = await getCurrentUserFromHeaders(requestHeaders);

  if (!actor || !hasCapability(actor.role, "dashboard.overview.read")) {
    notFound();
  }

  const canReadAudit = hasCapability(actor.role, "audit.read");
  const canReadUsers = hasCapability(actor.role, "admin.users.read");

  const [overviewStats, galleryStats, recentAuditEvents, recentGalleryEntries] =
    await Promise.all([
      getOverviewStats(),
      getGalleryOverviewStats(),
      canReadAudit ? listAuditEvents({ limit: 6 }) : Promise.resolve([]),
      listGalleryEntriesForDashboard({ state: "public", limit: 6 }),
    ]);

  const t = await getTranslations("dashboard.overview");
  const tPages = await getTranslations("dashboard.pages");

  return (
    <>
      <DashboardSiteHeader title={tPages("overview")} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Reveal>
            <KpiCard
              label={t("kpi.totalUsers.label")}
              value={overviewStats.totalUsers}
              sub={t("kpi.totalUsers.sub", {
                count: overviewStats.newUsersThisMonth,
              })}
              trend={{
                current: overviewStats.newUsersThisMonth,
                previous: overviewStats.newUsersLastMonth,
              }}
              vsPrevMonthLabel={t("kpi.comparison.vsPrevMonth")}
              icon={Users}
              accent="bg-emerald-500"
              iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
          </Reveal>
          <Reveal delay={0.04}>
            <KpiCard
              label={t("kpi.activeProjects.label")}
              value={overviewStats.activeProjects}
              sub={t("kpi.activeProjects.sub")}
              icon={FolderOpen}
              accent="bg-violet-500"
              iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <KpiCard
              label={t("kpi.activeShares.label")}
              value={overviewStats.activeShares}
              sub={t("kpi.activeShares.sub")}
              icon={Link2}
              accent="bg-orange-500"
              iconTone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
            />
          </Reveal>
          <Reveal delay={0.12}>
            <KpiCard
              label={t("kpi.gallery.label")}
              value={galleryStats.public}
              sub={t("kpi.gallery.sub", {
                featured: galleryStats.featured,
                unlisted: galleryStats.unlisted,
              })}
              icon={ImageIcon}
              accent="bg-sky-500"
              iconTone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            />
          </Reveal>
        </div>

        {/* Activity + Sign-ups (admin only) + Gallery */}
        <div
          className={`grid gap-4 ${canReadUsers ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
        >
          <Reveal className="bg-card rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">
                {t("sections.recentActivity")}
              </p>
              {canReadAudit && (
                <Link
                  href="/dashboard/audit"
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  {t("actions.viewAll")}
                </Link>
              )}
            </div>
            <RecentAuditEvents
              events={recentAuditEvents}
              t={t as (key: string, values?: Record<string, unknown>) => string}
            />
          </Reveal>

          {canReadUsers && (
            <Reveal className="bg-card rounded-xl border p-4" delay={0.04}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <UserPlus className="text-muted-foreground size-3.5" />
                  <p className="text-sm font-medium">
                    {t("sections.recentSignups")}
                  </p>
                </div>
                <Link
                  href="/dashboard/users"
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  {t("actions.viewAll")}
                </Link>
              </div>
              <RecentSignups
                users={overviewStats.recentUsers}
                t={
                  t as (key: string, values?: Record<string, unknown>) => string
                }
              />
            </Reveal>
          )}

          <Reveal
            className="bg-card rounded-xl border p-4"
            delay={canReadUsers ? 0.08 : 0.04}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">{t("sections.gallery")}</p>
              <Link
                href="/dashboard/gallery"
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                {t("actions.viewAll")}
              </Link>
            </div>
            <RecentGalleryEntries
              entries={recentGalleryEntries}
              t={t as (key: string, values?: Record<string, unknown>) => string}
            />
          </Reveal>
        </div>
      </div>
    </>
  );
}
