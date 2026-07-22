import type { Metadata } from "next";
import HomePage from "@/components/landing/HomePage";
import StaticLanguageProvider from "@/i18n/StaticLanguageProvider";
import { getStaticLandingMetadata } from "@/i18n/static-catalogs";
import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
  SITE_AUTHOR,
  SITE_KEYWORDS,
} from "@/lib/seo";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await getStaticLandingMetadata();

  return {
    title: {
      absolute: metadata.homeTitle,
    },
    description: metadata.homeDescription,
    keywords: SITE_KEYWORDS,
    authors: [SITE_AUTHOR],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: metadata.homeSocialTitle,
      description: metadata.homeSocialDescription,
      url: "/",
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
      title: metadata.homeSocialTitle,
      description: metadata.homeSocialDescription,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
  };
}

export default function Home() {
  return (
    <StaticLanguageProvider namespaces={["common", "landing"]}>
      <HomePage />
    </StaticLanguageProvider>
  );
}
