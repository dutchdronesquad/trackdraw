import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthEmailPreviewFrame } from "@/components/dev/AuthEmailPreviewFrame";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import {
  getAuthEmailPreviewContent,
  type AuthEmailPreviewKey,
} from "@/lib/server/auth-email";
import { hasCapability } from "@/lib/server/authorization";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard Email Preview",
  robots: { index: false, follow: false },
};

const previewKeys: AuthEmailPreviewKey[] = [
  "magic-link",
  "verify-email",
  "change-email",
];

const previewItemMessageKeys: Record<AuthEmailPreviewKey, string> = {
  "magic-link": "magicLink",
  "verify-email": "verifyEmail",
  "change-email": "changeEmail",
};

function parsePreviewKey(value: string | undefined): AuthEmailPreviewKey {
  return previewKeys.includes(value as AuthEmailPreviewKey)
    ? (value as AuthEmailPreviewKey)
    : "magic-link";
}

export default async function DashboardEmailPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ template?: string }>;
}) {
  const requestHeaders = new Headers(await headers());
  const currentUser = await getCurrentUserFromHeaders(requestHeaders);

  if (!currentUser || !hasCapability(currentUser.role, "audit.read")) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeKey = parsePreviewKey(resolvedSearchParams?.template);
  const content = getAuthEmailPreviewContent(activeKey);
  const fromAddress =
    process.env.PLUNK_FROM_EMAIL ?? "noreply@emails.trackdraw.app";

  const t = await getTranslations("dashboard");
  const tEmail = await getTranslations("dashboard.emailPreview");
  const previewItems = previewKeys.map((key) => ({
    key,
    label: tEmail(`items.${previewItemMessageKeys[key]}.label`),
    description: tEmail(`items.${previewItemMessageKeys[key]}.description`),
  }));
  const activeItem =
    previewItems.find((item) => item.key === activeKey) ?? previewItems[0];

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: t("siteHeader.dashboardCrumb"), href: "/dashboard" }}
        title={t("pages.emailPreview")}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-xl border">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">{tEmail("templates.title")}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {tEmail("templates.description")}
              </p>
            </div>
            <div className="space-y-2 p-3">
              {previewItems.map((item) => (
                <Link
                  key={item.key}
                  href={`/dashboard/email-preview?template=${item.key}`}
                  className={cn(
                    "block rounded-lg border px-3 py-3 transition-colors",
                    item.key === activeKey
                      ? "border-brand-primary/30 bg-brand-primary/10 text-foreground"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 opacity-80">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-xl border">
            <div className="border-b px-5 py-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium">{tEmail("htmlPreview")}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {activeItem.label}: {activeItem.description}
                  </p>
                </div>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span className="rounded-full border px-2.5 py-1 font-medium">
                    {fromAddress}
                  </span>
                  <span className="bg-muted rounded-full border px-2.5 py-1 font-medium">
                    {tEmail("desktop")}
                  </span>
                  <span className="rounded-full px-2.5 py-1 font-medium opacity-60">
                    {tEmail("mobileWidth")}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-muted/30 p-3 sm:p-5">
              <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border bg-[#dfe8f6] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <AuthEmailPreviewFrame
                  title={`${activeKey} email preview`}
                  html={content.htmlBody}
                  className="block w-full bg-[#dfe8f6]"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <div className="border-b px-5 py-3">
            <p className="text-sm font-medium">{tEmail("plainText")}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {tEmail("plainTextHelper")}
            </p>
          </div>
          <div className="p-5">
            <pre className="bg-muted/30 text-foreground overflow-x-auto rounded-xl border px-4 py-4 text-sm leading-6 whitespace-pre-wrap">
              {content.textBody}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
