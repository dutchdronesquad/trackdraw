import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import DashboardGalleryManager from "@/components/dashboard/GalleryManager";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { listGalleryEntriesForDashboard } from "@/lib/server/gallery";

export const metadata: Metadata = {
  title: "Dashboard Gallery",
  robots: {
    index: false,
    follow: false,
  },
};

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

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: "Dashboard", href: "/dashboard" }}
        title="Gallery"
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
