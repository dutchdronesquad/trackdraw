import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LanguageProvider from "@/i18n/LanguageProvider";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("share.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider namespaces={["common", "editor", "share"]}>
      {children}
    </LanguageProvider>
  );
}
