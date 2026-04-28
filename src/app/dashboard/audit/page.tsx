import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import DashboardAuditEventsTable, {
  type AuditEventCategory,
} from "@/components/dashboard/tables/AuditEventsTable";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { listAuditEvents } from "@/lib/server/audit";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";

export const metadata: Metadata = {
  title: "Dashboard Audit",
  robots: { index: false, follow: false },
};

type AuditFilter = "all" | "account" | "gallery";

function parseAuditFilter(value: string | string[] | undefined): AuditFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "account" || raw === "gallery") return raw;
  return "all";
}

function getInitialCategories(filter: AuditFilter): AuditEventCategory[] {
  if (filter === "account") return ["Account"];
  if (filter === "gallery") return ["Gallery"];
  return [];
}

export default async function DashboardAuditPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string | string[] }>;
}) {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "audit.read")) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeFilterValue = parseAuditFilter(resolvedSearchParams?.type);
  const initialCategories = getInitialCategories(activeFilterValue);
  const events = await listAuditEvents({ limit: 100 });

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: "Dashboard", href: "/dashboard" }}
        title="Audit"
      />
      <DashboardAuditEventsTable
        key={activeFilterValue}
        events={events}
        initialCategories={initialCategories}
      />
    </>
  );
}
