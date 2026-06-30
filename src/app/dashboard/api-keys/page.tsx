import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import DashboardPageIntro from "@/components/dashboard/PageIntro";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import DashboardApiKeysManager from "@/components/dashboard/ApiKeysManager";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { listApiKeysForAdmin } from "@/lib/server/api-keys";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return {
    title: `${tCommon("labels.dashboard")} ${t("pages.apiKeys")}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function DashboardApiKeysPage() {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "admin.api-keys.read")) {
    notFound();
  }

  const apiKeys = await listApiKeysForAdmin();
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.apiKeys")}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <DashboardPageIntro
          icon={KeyRound}
          title={t("pages.apiKeys")}
          description={t("pages.apiKeysIntro")}
          accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
        <DashboardApiKeysManager initialKeys={apiKeys} />
      </div>
    </>
  );
}
