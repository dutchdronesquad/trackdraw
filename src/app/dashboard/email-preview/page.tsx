import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import EmailPreviewWorkspace from "@/components/dashboard/EmailPreviewWorkspace";
import DashboardSiteHeader from "@/components/dashboard/SiteHeader";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import {
  getEmailPreviewContent,
  emailPreviewKeys,
  emailPreviewMeta,
  type EmailPreviewKey,
} from "@/lib/server/email-preview";
import { hasCapability } from "@/lib/server/authorization";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return {
    title: `${tCommon("labels.dashboard")} ${t("pages.emailPreview")}`,
    robots: { index: false, follow: false },
  };
}

const previewItemMessageKeys: Record<EmailPreviewKey, string> = {
  "magic-link": "magicLink",
  "verify-email": "verifyEmail",
  "change-email": "changeEmail",
  "retention-first": "retentionFirst",
  "retention-final": "retentionFinal",
};

function parsePreviewKey(value: string | undefined): EmailPreviewKey {
  return emailPreviewKeys.includes(value as EmailPreviewKey)
    ? (value as EmailPreviewKey)
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
  const content = getEmailPreviewContent(activeKey);
  const fromAddress =
    process.env.PLUNK_FROM_EMAIL ?? "noreply@emails.trackdraw.app";

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const tEmail = await getTranslations("dashboard.emailPreview");
  const templates = emailPreviewKeys.map((key) => ({
    key,
    label: tEmail(`items.${previewItemMessageKeys[key]}.label`),
    description: tEmail(`items.${previewItemMessageKeys[key]}.description`),
    subject: getEmailPreviewContent(key).subject,
    flow: emailPreviewMeta[key].flow,
  }));

  return (
    <>
      <DashboardSiteHeader
        parent={{ label: tCommon("labels.dashboard"), href: "/dashboard" }}
        title={t("pages.emailPreview")}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <EmailPreviewWorkspace
          templates={templates}
          activeKey={activeKey}
          fromAddress={fromAddress}
          recipient={emailPreviewMeta[activeKey].recipient}
          htmlBody={content.htmlBody}
          textBody={content.textBody}
        />
      </div>
    </>
  );
}
