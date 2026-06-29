import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import DashboardGalleryManager from "@/components/dashboard/GalleryManager";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { listGalleryEntriesForDashboard } from "@/lib/server/gallery";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return {
    title: `${tCommon("labels.dashboard")} ${t("pages.gallery")}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function DashboardGalleryPage() {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (
    !currentUser ||
    !hasCapability(currentUser.role, "gallery.entries.read")
  ) {
    notFound();
  }

  const entries = await listGalleryEntriesForDashboard();
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.gallery")}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DashboardGalleryManager
          currentUserRole={currentUser.role}
          initialEntries={entries}
        />
      </div>
    </>
  );
}
