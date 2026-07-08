import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { MagicLinkConfirm } from "./MagicLinkConfirm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login.magicLinkVerify");

  return {
    title: t("title"),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function MagicLinkPage() {
  return (
    <Suspense>
      <MagicLinkConfirm />
    </Suspense>
  );
}
