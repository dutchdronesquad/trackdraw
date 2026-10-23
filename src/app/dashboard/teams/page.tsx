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
      <div className="[&>header]:h-18">
        <DashboardSiteHeader title={t("title")} />
      </div>
      <div className="flex flex-1 flex-col p-6 pt-4">
        <LanguageProvider namespaces={["common", "dashboard", "dialogs"]}>
          <TeamsManager />
        </LanguageProvider>
      </div>
    </>
  );
}
