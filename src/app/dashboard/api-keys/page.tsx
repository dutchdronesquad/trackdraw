import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import DashboardApiKeysManager from "@/components/dashboard/ApiKeysManager";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { listApiKeysForAdmin } from "@/lib/server/api-keys";

export const metadata: Metadata = {
  title: "Dashboard API Keys",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardApiKeysPage() {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "admin.api-keys.read")) {
    notFound();
  }

  const apiKeys = await listApiKeysForAdmin();

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: "Dashboard", href: "/dashboard" }}
        title="API Keys"
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DashboardApiKeysManager initialKeys={apiKeys} />
      </div>
    </>
  );
}
