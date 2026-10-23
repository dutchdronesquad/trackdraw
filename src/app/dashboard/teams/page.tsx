import { Building2 } from "lucide-react";
import DashboardPageIntro from "@/components/dashboard/PageIntro";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import TeamsManager from "@/components/dashboard/TeamsManager";
import LanguageProvider from "@/i18n/LanguageProvider";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
export const metadata = { robots: { index: false, follow: false } };
export default async function TeamsPage() {
  const user = await getCurrentUserFromHeaders(new Headers(await headers()));
  if (user?.role !== "admin") notFound();
  const t = await getTranslations("dashboard.teams");
  return (
    <>
      <DashboardSiteHeader title={t("title")} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <DashboardPageIntro
          icon={Building2}
          title={t("title")}
          description={t("intro")}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <LanguageProvider namespaces={["common", "dashboard", "dialogs"]}>
          <TeamsManager />
        </LanguageProvider>
      </div>
    </>
  );
}
