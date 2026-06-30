import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import DashboardPageIntro from "@/components/dashboard/PageIntro";
import DashboardSharesManager from "@/components/dashboard/SharesManager";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { listSharesForDashboard } from "@/lib/server/shares";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return {
    title: `${tCommon("labels.dashboard")} ${t("pages.shares")}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function DashboardSharesPage() {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "shares.read")) {
    notFound();
  }

  const shares = await listSharesForDashboard();
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.shares")}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <DashboardPageIntro
          icon={Link2}
          title={t("pages.shares")}
          description={t("pages.sharesIntro")}
          accent="bg-orange-500/10 text-orange-600 dark:text-orange-400"
        />
        <DashboardSharesManager
          currentUserRole={currentUser.role}
          initialShares={shares}
        />
      </div>
    </>
  );
}
