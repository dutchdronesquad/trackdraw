import type { Metadata } from "next";
import StaticLanguageProvider from "@/i18n/StaticLanguageProvider";
import { getStaticLegalMetadata } from "@/i18n/static-catalogs";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await getStaticLegalMetadata("privacy");
  return {
    title: metadata.metaTitle,
    description: metadata.metaDescription,
    alternates: {
      canonical: "/privacy",
    },
  };
}

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaticLanguageProvider namespaces={["common", "landing", "legal"]}>
      {children}
    </StaticLanguageProvider>
  );
}
