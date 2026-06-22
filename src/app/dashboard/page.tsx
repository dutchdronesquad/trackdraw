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

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function actorLabel(actor: AuditEvent["actor"]): string {
  if (actor?.name) return actor.name;
  if (actor?.email) return actor.email;
  return "System";
}

// --- Event type config ---

type EventConfig = { icon: LucideIcon; label: string; tone: string };

const EVENT_CONFIG: Record<string, EventConfig> = {
  "account.role.changed": {
    icon: ShieldCheck,
    label: "Role changed",
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  "api_key.created": {
    icon: KeyRound,
    label: "API key created",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "api_key.revoked": {
    icon: KeyRound,
    label: "API key revoked",
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  "gallery.entry.featured": {
    icon: Sparkles,
    label: "Entry featured",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "gallery.entry.unfeatured": {
    icon: Sparkles,
    label: "Entry unfeatured",
    tone: "bg-muted text-muted-foreground",
  },
  "gallery.entry.hidden": {
    icon: EyeOff,
    label: "Entry hidden",
    tone: "bg-muted text-muted-foreground",
  },
  "gallery.entry.restored": {
    icon: Eye,
    label: "Entry restored",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "gallery.entry.deleted": {
    icon: Trash2,
    label: "Entry deleted",
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
};

const DEFAULT_EVENT_CONFIG: EventConfig = {
  icon: TrendingUp,
  label: "",
  tone: "bg-muted text-muted-foreground",
};

function eventConfig(eventType: string): EventConfig {
  return EVENT_CONFIG[eventType] ?? DEFAULT_EVENT_CONFIG;
}

function humanEventLabel(eventType: string): string {
  const cfg = EVENT_CONFIG[eventType];
  if (cfg) return cfg.label;
  return eventType.replace(/[._]/g, " ");
}

// --- Components ---

function KpiTrend({
  current,
  previous,
}: {
  current: number;
  previous: number;
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
      {pct}% vs prev month
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  accent,
  iconTone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  trend?: { current: number; previous: number };
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
          <p className="text-2xl leading-tight font-bold tabular-nums">
            {value}
          </p>
          {sub ? (
            <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
          ) : null}
          {trend ? (
            <div className="mt-1">
              <KpiTrend current={trend.current} previous={trend.previous} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RecentAuditEvents({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs">
        No recent activity
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {events.map((event) => {
        const cfg = eventConfig(event.eventType);
        const Icon = cfg.icon;
        return (
          <li key={event.id} className="flex items-start gap-3 py-2.5">
            <span
              className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md ${cfg.tone}`}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {actorLabel(event.actor)}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {humanEventLabel(event.eventType)}
              </p>
            </div>
            <time className="text-muted-foreground mt-0.5 shrink-0 text-xs tabular-nums">
              {formatRelativeTime(event.createdAt)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}

function RecentSignups({ users }: { users: RecentUser[] }) {
  if (users.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs">
        No recent sign-ups
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {users.map((user) => {
        const initial = (user.name ?? user.email)[0]?.toUpperCase() ?? "?";
        return (
          <li key={user.id} className="flex items-center gap-3 py-2.5">
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
              {formatRelativeTime(user.createdAt)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}

const GALLERY_STATE_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  featured: {
    label: "Featured",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  hidden: {
    label: "Hidden",
    className: "bg-muted text-muted-foreground",
  },
  listed: {
    label: "Listed",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
};

function RecentGalleryEntries({
  entries,
}: {
  entries: DashboardGalleryEntry[];
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs">
        No gallery entries yet
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((entry) => {
        const badge =
          GALLERY_STATE_BADGE[entry.galleryState] ??
          GALLERY_STATE_BADGE["listed"]!;
        return (
          <li key={entry.id} className="flex items-center gap-3 py-2.5">
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
              <ImageIcon className="text-muted-foreground size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {entry.galleryTitle || entry.shareTitle || "Untitled"}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {entry.ownerName ?? entry.ownerEmail ?? "Unknown"}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          </li>
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

  return (
    <>
      <DashboardSiteHeader title="Overview" />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard
            label="Total users"
            value={overviewStats.totalUsers}
            sub={`+${overviewStats.newUsersThisMonth} this month`}
            trend={{
              current: overviewStats.newUsersThisMonth,
              previous: overviewStats.newUsersLastMonth,
            }}
            icon={Users}
            accent="bg-emerald-500"
            iconTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            label="Active projects"
            value={overviewStats.activeProjects}
            sub="non-archived"
            icon={FolderOpen}
            accent="bg-violet-500"
            iconTone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <KpiCard
            label="Active shares"
            value={overviewStats.activeShares}
            sub="live share links"
            icon={Link2}
            accent="bg-orange-500"
            iconTone="bg-orange-500/10 text-orange-600 dark:text-orange-400"
          />
          <KpiCard
            label="Gallery"
            value={galleryStats.total}
            sub={`${galleryStats.featured} featured · ${galleryStats.hidden} hidden`}
            icon={ImageIcon}
            accent="bg-sky-500"
            iconTone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />
        </div>

        {/* Activity + Sign-ups (admin only) + Gallery */}
        <div
          className={`grid gap-4 ${canReadUsers ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
        >
          <div className="bg-card rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Recent activity</p>
              {canReadAudit && (
                <Link
                  href="/dashboard/audit"
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  View all
                </Link>
              )}
            </div>
            <RecentAuditEvents events={recentAuditEvents} />
          </div>

          {canReadUsers && (
            <div className="bg-card rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <UserPlus className="text-muted-foreground size-3.5" />
                  <p className="text-sm font-medium">Recent sign-ups</p>
                </div>
                <Link
                  href="/dashboard/users"
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  View all
                </Link>
              </div>
              <RecentSignups users={overviewStats.recentUsers} />
            </div>
          )}

          <div className="bg-card rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Gallery</p>
              <Link
                href="/dashboard/gallery"
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                View all
              </Link>
            </div>
            <RecentGalleryEntries entries={recentGalleryEntries} />
          </div>
        </div>
      </div>
    </>
  );
}
