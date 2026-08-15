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
import { listAuditEvents, type AuditEvent } from "@/lib/server/audit";
import {
  getGalleryOverviewStats,
  listGalleryEntriesForDashboard,
  type DashboardGalleryEntry,
} from "@/lib/server/gallery";
import { getOverviewStats, type RecentUser } from "@/lib/server/metrics";
import { getDailyCockpit } from "@/lib/server/dashboard-cockpit";

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

function PlatformStat({
  label,
  value,
  icon: Icon,
  accent,
  iconTone,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent: string;
  iconTone: string;
}) {
  return (
    <div
      className={`flex h-full min-w-0 items-center gap-3 border-t-2 p-4 sm:px-5 ${accent}`}
    >
      <span
        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${iconTone}`}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-sm leading-snug">{label}</p>
        <p className="text-xl leading-tight font-semibold tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

function RecentChanges({
  events,
  users,
  t,
}: {
  events: AuditEvent[];
  users: RecentUser[];
  t: (key: string, values?: Record<string, unknown>) => string;
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

  return (
    <ul className="divide-y">
      {changes.map((change, index) => {
        if (change.kind === "signup") {
          const displayName =
            change.user.name?.trim() ||
            change.user.email?.trim() ||
            t("fallback.unknownUser");
          return (
            <RevealListItem
              key={`signup-${change.id}`}
              className="flex min-h-14 items-center gap-3 py-2.5"
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
            className="flex min-h-14 items-center gap-3 py-2.5"
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
    <ul className="divide-y">
      {entries.map((entry, index) => {
        const badge =
          GALLERY_STATE_BADGE[entry.galleryState] ??
          GALLERY_STATE_BADGE["listed"]!;
        return (
          <RevealListItem
            key={entry.id}
            className="flex min-h-14 items-center gap-3 py-2.5"
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
              className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${badge.className}`}
            >
              {t(`galleryState.${badge.labelKey}`)}
            </span>
            <ArrowRight
              className="text-muted-foreground size-3.5"
              aria-hidden="true"
            />
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
  const updatedAt = cockpit
    ? new Intl.DateTimeFormat(locale, {
        timeZone: "Europe/Amsterdam",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(cockpit.generatedAt))
    : null;

  return (
    <>
      <DashboardSiteHeader title={tPages("overview")} />
      <main className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col gap-6 p-3 pt-0 sm:p-4 sm:pt-0">
        <header className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {tPages("overview")}
          </h1>
          {updatedAt ? (
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t("updatedAt", { time: updatedAt })}
            </p>
          ) : null}
        </header>

        {canReadMetrics ? <DailyCockpit data={cockpit} /> : null}

        <section aria-labelledby="platform-snapshot" className="space-y-3">
          <div>
            <h2 id="platform-snapshot" className="text-base font-semibold">
              {t("sections.platformSnapshot")}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("sections.platformSnapshotDescription")}
            </p>
          </div>
          <div className="grid grid-cols-1 overflow-hidden rounded-xl border sm:grid-cols-2 xl:grid-cols-4 xl:[&>*]:border-b-0 [&>*:not(:last-child)]:border-b xl:[&>*:not(:last-child)]:border-r sm:[&>*:nth-child(odd)]:border-r">
            <Reveal className="h-full">
              <PlatformStat
                label={t("kpi.totalUsers.label")}
                value={overviewStats.totalUsers}
                icon={Users}
                accent="border-emerald-500/70"
                iconTone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              />
            </Reveal>
            <Reveal className="h-full" delay={0.03}>
              <PlatformStat
                label={t("kpi.activeProjects.label")}
                value={overviewStats.activeProjects}
                icon={FolderOpen}
                accent="border-violet-500/70"
                iconTone="bg-violet-500/10 text-violet-700 dark:text-violet-300"
              />
            </Reveal>
            <Reveal className="h-full" delay={0.06}>
              <PlatformStat
                label={t("kpi.activeShares.label")}
                value={overviewStats.activeShares}
                icon={Link2}
                accent="border-orange-500/70"
                iconTone="bg-orange-500/10 text-orange-700 dark:text-orange-300"
              />
            </Reveal>
            <Reveal className="h-full" delay={0.09}>
              <PlatformStat
                label={t("kpi.gallery.label")}
                value={galleryStats.public}
                icon={ImageIcon}
                accent="border-sky-500/70"
                iconTone="bg-sky-500/10 text-sky-700 dark:text-sky-300"
              />
            </Reveal>
          </div>
        </section>

        <div className="grid items-start border-t pt-6 lg:grid-cols-[minmax(0,7fr)_minmax(18rem,5fr)]">
          <Reveal className="min-w-0 lg:pr-6">
            <div className="flex min-h-11 items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">
                  {t("sections.recentChanges")}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t("sections.recentChangesDescription")}
                </p>
              </div>
              {canReadAudit ? (
                <Link
                  href="/dashboard/audit"
                  prefetch={false}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
            />
          </Reveal>

          <Reveal
            className="mt-6 min-w-0 border-t pt-6 lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
            delay={0.04}
          >
            <div className="flex min-h-11 items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">
                  {t("sections.gallery")}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t("sections.galleryDescription")}
                </p>
              </div>
              <Link
                href="/dashboard/gallery"
                prefetch={false}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
