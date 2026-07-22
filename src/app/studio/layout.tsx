import type { Metadata } from "next";
import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
} from "@/lib/seo";
import StaticLanguageProvider from "@/i18n/StaticLanguageProvider";
import { getStaticLandingMetadata } from "@/i18n/static-catalogs";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await getStaticLandingMetadata();

  return {
    title: metadata.studioTitle,
    description: metadata.studioDescription,
    alternates: {
      canonical: "/studio",
    },
    openGraph: {
      title: metadata.studioSocialTitle,
      description: metadata.studioSocialDescription,
      url: "/studio",
      images: [
        {
          url: DEFAULT_SOCIAL_IMAGE,
          width: DEFAULT_SOCIAL_IMAGE_WIDTH,
          height: DEFAULT_SOCIAL_IMAGE_HEIGHT,
          alt: DEFAULT_OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      title: metadata.studioSocialTitle,
      description: metadata.studioSocialDescription,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaticLanguageProvider
      namespaces={[
        "common",
        "dialogs",
        "editor",
        "exportPdf",
        "inspector",
        "setupEstimate",
        "shapes",
      ]}
    >
      <div style={{ "--radius": "0.375rem" } as React.CSSProperties}>
        {children}
      </div>
    </StaticLanguageProvider>
  );
}
