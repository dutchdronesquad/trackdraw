import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import DashboardGalleryManager from "@/components/dashboard/GalleryManager";
import DashboardPageIntro from "@/components/dashboard/PageIntro";
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
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <DashboardPageIntro
          icon={ImageIcon}
          title={t("pages.gallery")}
          description={t("pages.galleryIntro")}
          accent="bg-sky-500/10 text-sky-600 dark:text-sky-400"
        />
        <DashboardGalleryManager
          currentUserRole={currentUser.role}
          initialEntries={entries}
        />
      </div>
    </>
  );
}
