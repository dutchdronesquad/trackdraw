import type { Metadata } from "next";
import "@trackdraw/viewer/static/trackdraw-viewer.css";
import BioPage from "@/components/bio/BioPage";
import StaticLanguageProvider from "@/i18n/StaticLanguageProvider";
import { getStaticBioMetadata } from "@/i18n/static-catalogs";
import { bioConfig } from "@/lib/bio";
import {
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_ALT,
} from "@/lib/seo";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await getStaticBioMetadata();
  return {
    title,
    description,
    alternates: { canonical: "/bio" },
    openGraph: {
      title,
      description,
      url: "/bio",
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
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
  };
}

export default function Bio() {
  return (
    <StaticLanguageProvider namespaces={["landing"]}>
      <BioPage config={bioConfig} />
    </StaticLanguageProvider>
  );
}
