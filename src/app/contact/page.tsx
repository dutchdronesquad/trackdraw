import type { Metadata } from "next";
import ContactPage from "@/components/landing/ContactPage";
import StaticLanguageProvider from "@/i18n/StaticLanguageProvider";
import { getStaticContactMetadata } from "@/i18n/static-catalogs";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await getStaticContactMetadata();
  return {
    title: metadata.title,
    description: metadata.description,
    alternates: { canonical: "/contact" },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url: "/contact",
    },
    twitter: { title: metadata.title, description: metadata.description },
  };
}

export default function Page() {
  return (
    <StaticLanguageProvider namespaces={["common", "landing"]}>
      <ContactPage />
    </StaticLanguageProvider>
  );
}
