import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
} from "@/lib/seo";
import LanguageProvider from "@/i18n/LanguageProvider";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.metadata");

  return {
    title: t("studioTitle"),
    description: t("studioDescription"),
    alternates: {
      canonical: "/studio",
    },
    openGraph: {
      title: t("studioSocialTitle"),
      description: t("studioSocialDescription"),
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
      title: t("studioSocialTitle"),
      description: t("studioSocialDescription"),
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
    <LanguageProvider
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
    </LanguageProvider>
  );
}
