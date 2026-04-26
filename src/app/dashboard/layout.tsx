import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import DashboardAppSidebar from "@/components/dashboard/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import {
  canAccessDashboard,
  getVisibleDashboardModules,
  hasCapability,
} from "@/lib/server/authorization";
import { getGalleryOverviewStats } from "@/lib/server/gallery";
import { countUsersForAdmin } from "@/lib/server/users";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = new Headers(await headers());
  const user = await getCurrentUserFromHeaders(requestHeaders);

  if (!user) {
    redirect("/login");
  }

  if (!canAccessDashboard(user.role)) {
    notFound();
  }

  const currentUserName =
    user.name?.trim() || user.email?.trim() || "Dashboard user";
  const currentUserEmail = user.email?.trim() || "dashboard@trackdraw.local";
  const visibleModules = getVisibleDashboardModules(user.role);
  const [galleryStats, totalUsers] = await Promise.all([
    visibleModules.includes("gallery") ? getGalleryOverviewStats() : null,
    hasCapability(user.role, "admin.users.read") ? countUsersForAdmin() : null,
  ]);

  return (
    <SidebarProvider
      style={
        {
          "--header-height": "calc(var(--spacing) * 12)",
          "--radius": "0.625rem",
        } as React.CSSProperties
      }
    >
      <DashboardAppSidebar
        currentUser={{
          name: currentUserName,
          email: currentUserEmail,
          role: user.role,
        }}
        visibleModules={visibleModules}
        itemBadges={{
          ...(galleryStats ? { gallery: galleryStats.total } : {}),
          ...(totalUsers !== null ? { users: totalUsers } : {}),
        }}
      />
      <SidebarInset className="ml-0!">{children}</SidebarInset>
    </SidebarProvider>
  );
}
