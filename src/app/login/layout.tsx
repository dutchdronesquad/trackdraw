import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LanguageProvider from "@/i18n/LanguageProvider";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login.metadata");

  return {
    title: t("title"),
    description: t("description"),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider namespaces={["common", "login"]}>
      {children}
    </LanguageProvider>
  );
}
