import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { YearInNumbersView } from "@/components/dashboard/YearInNumbersView";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { loadYearInNumbers } from "@/lib/server/year-in-numbers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.yearInNumbers");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function YearInNumbersPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await getCurrentUserFromHeaders(new Headers(await headers()));
  if (!user || !hasCapability(user.role, "admin.metrics.read")) notFound();
  // oxlint-disable-next-line react/purity -- request-time server reporting boundary
  const now = new Date();
  const { year: requestedYear } = await searchParams;
  const year =
    requestedYear === undefined ? now.getUTCFullYear() : Number(requestedYear);
  if (!Number.isInteger(year) || year < 2026 || year > now.getUTCFullYear())
    notFound();
  const report = await loadYearInNumbers(year, now);
  const t = await getTranslations("dashboard.yearInNumbers");
  const tCommon = await getTranslations("common");
  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("title")}
      />
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 pt-0 pb-6">
        <YearInNumbersView report={report} currentYear={now.getUTCFullYear()} />
      </main>
    </>
  );
}
