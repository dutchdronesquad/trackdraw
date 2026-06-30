import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import DashboardAuditEventsTable, {
  type AuditEventCategory,
} from "@/components/dashboard/tables/AuditEventsTable";
import DashboardPageIntro from "@/components/dashboard/PageIntro";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { listAuditEvents } from "@/lib/server/audit";
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
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

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
        <DashboardAuditEventsTable
          key={activeFilterValue}
          events={events}
          initialCategories={initialCategories}
        />
      </div>
    </>
  );
}
