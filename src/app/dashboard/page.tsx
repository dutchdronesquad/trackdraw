import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  FolderOpen,
  ImageIcon,
  KeyRound,
  Link2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Reveal, RevealListItem } from "@/components/motion/Reveal";
import DailyCockpit from "@/components/dashboard/DailyCockpit";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { getSiteMediaUrl } from "@/lib/seo";
import { listAuditEvents, type AuditEvent } from "@/lib/server/audit";
import {
  getGalleryOverviewStats,
  listGalleryEntriesForDashboard,
  type DashboardGalleryEntry,
} from "@/lib/server/gallery";
import { getOverviewStats, type RecentUser } from "@/lib/server/metrics";
import { getDailyCockpit } from "@/lib/server/dashboard-cockpit";
import { create24HourDateTimeFormatter } from "@/lib/date-time";

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

function createDayLabel(
  locale: string,
  labels: { today: string; yesterday: string }
) {
  const timeZone = "Europe/Amsterdam";
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const keyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone });
  const now = Date.now();
  const todayKey = keyFormatter.format(new Date(now));
  const yesterdayKey = keyFormatter.format(new Date(now - 86_400_000));
  return (value: string) => {
    const key = keyFormatter.format(new Date(value));
    if (key === todayKey) return labels.today;
    if (key === yesterdayKey) return labels.yesterday;
    return dayFormatter.format(new Date(value));
  };
}

function RecentChanges({
  events,
  users,
  t,
  dayLabel,
}: {
  events: AuditEvent[];
  users: RecentUser[];
  t: (key: string, values?: Record<string, unknown>) => string;
  dayLabel: (value: string) => string;
}) {
  const changes = [
    ...events.map((event) => ({
      kind: "audit" as const,
      id: event.id,
      createdAt: event.createdAt,
      event,
    })),
    ...users.map((user) => ({
      kind: "signup" as const,
      id: user.id,
      createdAt: user.createdAt,
      user,
    })),
  ]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 8);

  if (changes.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        {t("empty.recentActivity")}
      </p>
    );
  }

  const renderChange = (change: (typeof changes)[number], index: number) => {
    if (change.kind === "signup") {
      const displayName =
        change.user.name?.trim() ||
        change.user.email?.trim() ||
        t("fallback.unknownUser");
      return (
        <RevealListItem
          key={`signup-${change.id}`}
          className="flex min-h-14 items-center gap-3 px-4 py-2.5"
          delay={index * 0.03}
        >
          <span className="bg-muted text-muted-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
            <UserPlus className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-3">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="text-muted-foreground truncate text-sm">
              {t("events.signedUp")}
            </p>
          </div>
          <time className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatRelativeTime(change.createdAt, t)}
          </time>
        </RevealListItem>
      );
    }

    const cfg = eventConfig(change.event.eventType);
    const Icon = cfg.icon;
    return (
      <RevealListItem
        key={`audit-${change.id}`}
        className="flex min-h-14 items-center gap-3 px-4 py-2.5"
        delay={index * 0.03}
      >
        <span
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${cfg.tone}`}
        >
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-3">
          <p className="truncate text-sm font-medium">
            {actorLabel(change.event.actor, t("events.system"))}
          </p>
          <p className="text-muted-foreground truncate text-sm">
            {humanEventLabel(change.event.eventType, t)}
          </p>
        </div>
        <time className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {formatRelativeTime(change.createdAt, t)}
        </time>
      </RevealListItem>
    );
  };

  return (
    <ul className="divide-y">
      {changes.map((change, index) => {
        const label = dayLabel(change.createdAt);
        const header =
          index === 0 || dayLabel(changes[index - 1].createdAt) !== label ? (
            <li
              key={`day-${label}`}
              className="bg-muted text-muted-foreground px-4 py-1.5 text-xs font-medium"
            >
              {label}
            </li>
          ) : null;
        return [header, renderChange(change, index)];
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
      <p className="text-muted-foreground py-6 text-center text-sm">
        {t("empty.galleryEntries")}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 p-4">
      {entries.slice(0, 4).map((entry, index) => {
        const badge =
          GALLERY_STATE_BADGE[entry.galleryState] ??
          GALLERY_STATE_BADGE["listed"]!;
        const previewUrl = entry.galleryPreviewImage
          ? entry.galleryPreviewImage.startsWith("http")
            ? entry.galleryPreviewImage
            : getSiteMediaUrl(entry.galleryPreviewImage)
          : null;
        return (
          <RevealListItem key={entry.id} delay={index * 0.03}>
            <Link
              href="/dashboard/gallery"
              prefetch={false}
              className="focus-visible:ring-ring flex min-w-0 flex-col gap-1.5 rounded-md focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="bg-muted relative block aspect-video overflow-hidden rounded-md border">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span className="text-muted-foreground absolute inset-0 flex items-center justify-center bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_6px,transparent_6px,transparent_12px)]">
                    <ImageIcon className="size-4" aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {entry.galleryTitle ||
                    entry.shareTitle ||
                    t("fallback.untitled")}
                </span>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${badge.className}`}
                >
                  {t(`galleryState.${badge.labelKey}`)}
                </span>
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {entry.ownerName ??
                  entry.ownerEmail ??
                  t("fallback.unknownOwner")}
              </span>
            </Link>
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
  const canReadMetrics = hasCapability(actor.role, "admin.metrics.read");
  const cockpitPromise = canReadMetrics
    ? getDailyCockpit().catch((error: unknown) => {
        console.error("Dashboard daily focus unavailable", error);
        return null;
      })
    : Promise.resolve(null);

  const [
    overviewStats,
    galleryStats,
    recentAuditEvents,
    recentGalleryEntries,
    cockpit,
  ] = await Promise.all([
    getOverviewStats(),
    getGalleryOverviewStats(),
    canReadAudit ? listAuditEvents({ limit: 6 }) : Promise.resolve([]),
    listGalleryEntriesForDashboard({ state: "public", limit: 6 }),
    cockpitPromise,
  ]);

  const t = await getTranslations("dashboard.overview");
  const tPages = await getTranslations("dashboard.pages");
  const locale = await getLocale();
  const number = new Intl.NumberFormat(locale);
  const dayLabel = createDayLabel(locale, {
    today: t("days.today"),
    yesterday: t("days.yesterday"),
  });
  const updatedAt = cockpit
    ? create24HourDateTimeFormatter(locale, {
        timeZone: "Europe/Amsterdam",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(cockpit.generatedAt))
    : null;

  return (
    <>
      <DashboardSiteHeader title={tPages("overview")} />
      <main className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col gap-6 p-4 pt-0">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {tPages("overview")}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
              {t("description")}
            </p>
          </div>
          {updatedAt ? (
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t("updatedAt", { time: updatedAt })}
            </p>
          ) : null}
        </header>

        {canReadMetrics ? <DailyCockpit data={cockpit} /> : null}

        <section aria-labelledby="platform-snapshot">
          <h2 id="platform-snapshot" className="sr-only">
            {t("sections.platformSnapshot")}
          </h2>
          <dl className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[
              {
                key: "totalUsers",
                icon: Users,
                value: overviewStats.totalUsers,
              },
              {
                key: "activeProjects",
                icon: FolderOpen,
                value: overviewStats.activeProjects,
              },
              {
                key: "activeShares",
                icon: Link2,
                value: overviewStats.activeShares,
              },
              { key: "gallery", icon: ImageIcon, value: galleryStats.public },
            ].map(({ key, icon: Icon, value }) => (
              <div key={key} className="flex items-center gap-2">
                <Icon className="size-4" aria-hidden="true" />
                <dd className="text-foreground font-semibold tabular-nums">
                  {number.format(value)}
                </dd>
                <dt>{t(`kpi.${key}.label`)}</dt>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(18rem,5fr)]">
          <Reveal className="bg-card min-w-0 overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
              <h2 className="text-sm font-semibold">
                {t("sections.recentChanges")}
              </h2>
              {canReadAudit ? (
                <Link
                  href="/dashboard/audit"
                  prefetch={false}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {t("actions.viewAll")}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            <RecentChanges
              events={recentAuditEvents}
              users={canReadUsers ? overviewStats.recentUsers : []}
              t={t as (key: string, values?: Record<string, unknown>) => string}
              dayLabel={dayLabel}
            />
          </Reveal>

          <Reveal
            className="bg-card min-w-0 overflow-hidden rounded-lg border"
            delay={0.04}
          >
            <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
              <h2 className="text-sm font-semibold">{t("sections.gallery")}</h2>
              <Link
                href="/dashboard/gallery"
                prefetch={false}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {t("actions.viewAll")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <RecentGalleryEntries
              entries={recentGalleryEntries}
              t={t as (key: string, values?: Record<string, unknown>) => string}
            />
          </Reveal>
        </div>
      </main>
    </>
  );
}
