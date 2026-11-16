import type { Metadata } from "next";
import { InvitationPage } from "@/components/teams/InvitationPage";
import LanguageProvider from "@/i18n/LanguageProvider";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "same-origin",
};
export default async function Page({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  return (
    <LanguageProvider namespaces={["dialogs"]}>
      <InvitationPage invitationId={invitationId} />
    </LanguageProvider>
  );
}
