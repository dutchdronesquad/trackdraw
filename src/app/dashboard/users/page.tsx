import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import DashboardSiteHeader from "@/components/dashboard/DashboardSiteHeader";
import DashboardUsersManager from "@/components/dashboard/DashboardUsersManager";
import { getCurrentUserFromHeaders } from "@/lib/server/auth";
import { hasCapability } from "@/lib/server/authorization";
import { listUsersForAdmin } from "@/lib/server/users";

export const metadata: Metadata = {
  title: "Dashboard Users",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardUsersPage() {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "admin.users.read")) {
    notFound();
  }

  const users = await listUsersForAdmin();

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: "Dashboard", href: "/dashboard" }}
        title="Users"
        description="Manage roles and account access"
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DashboardUsersManager
          currentUserId={currentUser.id}
          initialUsers={users}
        />
      </div>
    </>
  );
}
