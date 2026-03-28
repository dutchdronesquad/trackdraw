import type { Metadata } from "next";
import { getShareDescription, getShareTitle } from "@/lib/share";
import { resolveShareView } from "@/lib/server/share-resolution";
import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
  SITE_NAME,
} from "@/lib/seo";

type ShareTokenLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    token: string;
  }>;
};

export async function generateMetadata({
  params,
}: ShareTokenLayoutProps): Promise<Metadata> {
  const { token } = await params;
  const resolvedShare = await resolveShareView(token);

  if (resolvedShare.status === "expired") {
    return {
      title: "Expired Track Share",
      description:
        "This TrackDraw share link has expired. Ask the sender to publish a fresh link.",
    };
  }

  if (resolvedShare.status === "retired") {
    return {
      title: "Unsupported Track Share",
      description:
        "This older TrackDraw share format is no longer supported. Ask the sender to publish a fresh link.",
    };
  }

  if (resolvedShare.status !== "available") {
    return {
      title: "View Track",
      description: "View this FPV race track designed with TrackDraw.",
    };
  }

  const design = resolvedShare.design;

  const title =
    resolvedShare.source === "stored"
      ? resolvedShare.title
      : getShareTitle(design);
  const description =
    resolvedShare.source === "stored"
      ? resolvedShare.description
      : getShareDescription(design);
  const encodedToken = encodeURIComponent(token);
  const socialImage = {
    url: DEFAULT_SOCIAL_IMAGE,
    width: DEFAULT_SOCIAL_IMAGE_WIDTH,
    height: DEFAULT_SOCIAL_IMAGE_HEIGHT,
    alt: DEFAULT_OG_IMAGE_ALT,
  };

  return {
    title,
    description,
    alternates: {
      canonical: `/share/${encodedToken}`,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: `/share/${encodedToken}`,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
  };
}

export default function ShareTokenLayout({ children }: ShareTokenLayoutProps) {
  return <>{children}</>;
}
