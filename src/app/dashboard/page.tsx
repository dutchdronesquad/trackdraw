import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ImageIcon } from "lucide-react";
import DashboardOverviewCards from "@/components/dashboard/OverviewCards";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { listAuditEvents, type AuditEvent } from "@/lib/server/audit";
import {
  getGalleryOverviewStats,
  listGalleryEntriesForDashboard,
  type DashboardGalleryEntry,
} from "@/lib/server/gallery";
import { countUsersForAdmin } from "@/lib/server/users";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatEventLabel(event: AuditEvent): string {
  const type = event.eventType.replace(/_/g, " ");
  if (event.actor?.name) return `${event.actor.name} — ${type}`;
  if (event.actor?.email) return `${event.actor.email} — ${type}`;
  return type;
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
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-center justify-between gap-3 py-2.5"
        >
          <p className="truncate text-sm">{formatEventLabel(event)}</p>
          <time className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatRelativeTime(event.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}

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
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center gap-3 py-2.5">
          <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
            {entry.galleryPreviewImage ? (
              <Image
                src={entry.galleryPreviewImage}
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-md object-cover"
              />
            ) : (
              <ImageIcon className="text-muted-foreground size-3.5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {entry.galleryTitle || entry.shareTitle || "Untitled"}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {entry.ownerName ?? entry.ownerEmail ?? "Unknown"} ·{" "}
              {entry.galleryState}
            </p>
          </div>
          <Link
            href={`/dashboard/gallery`}
            className="text-muted-foreground hover:text-foreground shrink-0 text-xs transition-colors"
          >
            View
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const requestHeaders = new Headers(await headers());
  const actor = await getCurrentUserFromHeaders(requestHeaders);

  if (!actor || !hasCapability(actor.role, "dashboard.overview.read")) {
    notFound();
  }

  const canReadUsers = hasCapability(actor.role, "admin.users.read");
  const canReadAudit = hasCapability(actor.role, "audit.read");

  const [galleryStats, totalUsers, recentAuditEvents, recentGalleryEntries] =
    await Promise.all([
      getGalleryOverviewStats(),
      canReadUsers ? countUsersForAdmin() : Promise.resolve(null),
      canReadAudit ? listAuditEvents({ limit: 5 }) : Promise.resolve([]),
      listGalleryEntriesForDashboard({ limit: 5 }),
    ]);

  return (
    <>
      <DashboardSiteHeader title="Overview" />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <DashboardOverviewCards
          galleryStats={galleryStats}
          totalUsers={totalUsers}
        />

        <div className="grid gap-4 lg:grid-cols-2">
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

          <div className="bg-card rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Recent gallery entries</p>
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
