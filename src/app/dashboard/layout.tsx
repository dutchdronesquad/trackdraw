import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import DashboardAppSidebar from "@/components/dashboard/DashboardAppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import {
  canAccessDashboard,
  getVisibleDashboardModules,
} from "@/lib/server/authorization";

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
        visibleModules={getVisibleDashboardModules(user.role)}
      />
      <SidebarInset className="ml-0!">{children}</SidebarInset>
    </SidebarProvider>
  );
}
