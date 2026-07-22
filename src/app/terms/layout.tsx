import type { Metadata } from "next";
import StaticLanguageProvider from "@/i18n/StaticLanguageProvider";
import { getStaticLegalMetadata } from "@/i18n/static-catalogs";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await getStaticLegalMetadata("terms");
  return {
    title: metadata.metaTitle,
    description: metadata.metaDescription,
    alternates: {
      canonical: "/terms",
    },
  };
}

export default function TermsLayout({
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
