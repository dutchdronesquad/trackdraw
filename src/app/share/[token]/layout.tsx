import type { Metadata } from "next";
import { getShareDescription, getShareTitle } from "@/lib/share";
import {
  getGalleryEntryByShareToken,
  isPublicGalleryState,
} from "@/lib/server/gallery";
import { resolveShareView } from "@/lib/server/share-resolution";
import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
  SITE_NAME,
  getSiteMediaUrl,
} from "@/lib/seo";

type ShareTokenLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    token: string;
  }>;
};

function resolveSocialImageUrl(previewImage: string | null | undefined) {
  if (!previewImage) return DEFAULT_SOCIAL_IMAGE;
  if (previewImage.startsWith("http")) return previewImage;

  return getSiteMediaUrl(previewImage);
}

function buildShareMetadataDescription(params: {
  description: string;
  fieldWidth: number;
  fieldHeight: number;
  shapeCount: number;
}) {
  const base = params.description.trim();
  const fieldLabel = `${params.fieldWidth} x ${params.fieldHeight} m`;
  const obstacleLabel =
    params.shapeCount === 1 ? "1 obstacle" : `${params.shapeCount} obstacles`;
  const detail = `FPV drone race track layout built with TrackDraw on a ${fieldLabel} field with ${obstacleLabel}.`;

  return base ? `${base} ${detail}` : detail;
}

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
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  if (resolvedShare.status === "retired") {
    return {
      title: "Unsupported Track Share",
      description:
        "This older TrackDraw share format is no longer supported. Ask the sender to publish a fresh link.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  if (resolvedShare.status !== "available") {
    return {
      title: "View Track",
      description: "View this FPV race track designed with TrackDraw.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const design = resolvedShare.design;
  const galleryEntry =
    resolvedShare.source === "stored"
      ? await getGalleryEntryByShareToken(token)
      : null;
  const isPublicGalleryShare = isPublicGalleryState(galleryEntry?.galleryState);

  const title =
    isPublicGalleryShare && galleryEntry
      ? `${galleryEntry.galleryTitle} | FPV Drone Race Track`
      : resolvedShare.source === "stored"
        ? resolvedShare.title
        : getShareTitle(design);
  const description =
    isPublicGalleryShare && galleryEntry
      ? buildShareMetadataDescription({
          description: galleryEntry.galleryDescription,
          fieldWidth: design.field.width,
          fieldHeight: design.field.height,
          shapeCount: design.shapeOrder.length,
        })
      : resolvedShare.source === "stored"
        ? resolvedShare.description
        : getShareDescription(design);
  const encodedToken = encodeURIComponent(token);
  const socialImageUrl = isPublicGalleryShare
    ? resolveSocialImageUrl(galleryEntry?.galleryPreviewImage)
    : DEFAULT_SOCIAL_IMAGE;
  const socialImage = {
    url: socialImageUrl,
    width: DEFAULT_SOCIAL_IMAGE_WIDTH,
    height: DEFAULT_SOCIAL_IMAGE_HEIGHT,
    alt:
      isPublicGalleryShare && galleryEntry
        ? `${galleryEntry.galleryTitle} track preview`
        : DEFAULT_OG_IMAGE_ALT,
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
      images: [socialImageUrl],
    },
    robots: {
      index: isPublicGalleryShare,
      follow: true,
    },
  };
}

export default function ShareTokenLayout({ children }: ShareTokenLayoutProps) {
  return <>{children}</>;
}
