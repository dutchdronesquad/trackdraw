import type { Metadata } from "next";
import { InvitationPage } from "@/components/teams/InvitationPage";
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
  return <InvitationPage invitationId={invitationId} />;
}
