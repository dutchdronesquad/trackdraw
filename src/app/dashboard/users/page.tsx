import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Users as UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import DashboardPageIntro from "@/components/dashboard/PageIntro";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import DashboardUsersManager from "@/components/dashboard/UsersManager";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { listUsersForAdmin } from "@/lib/server/users";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return {
    title: `${tCommon("labels.dashboard")} ${t("pages.users")}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function DashboardUsersPage() {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "admin.users.read")) {
    notFound();
  }

  const users = await listUsersForAdmin();
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.users")}
      />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <DashboardPageIntro
          icon={UsersIcon}
          title={t("pages.users")}
          description={t("pages.usersIntro")}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <DashboardUsersManager
          currentUserId={currentUser.id}
          initialUsers={users}
        />
      </div>
    </>
  );
}
