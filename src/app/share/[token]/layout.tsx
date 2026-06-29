import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
import { formatFieldSize } from "@/lib/track/units";

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
  const fieldLabel = formatFieldSize(
    params.fieldWidth,
    params.fieldHeight,
    "metric"
  );
  const obstacleLabel =
    params.shapeCount === 1 ? "1 obstacle" : `${params.shapeCount} obstacles`;
  const detail = `FPV drone race track layout built with TrackDraw on a ${fieldLabel} field with ${obstacleLabel}.`;

  return base ? `${base} ${detail}` : detail;
}

export async function generateMetadata({
  params,
}: ShareTokenLayoutProps): Promise<Metadata> {
  const t = await getTranslations("share.metadata");
  const { token } = await params;
  const resolvedShare = await resolveShareView(token);

  if (resolvedShare.status === "expired") {
    return {
      title: t("expiredTitle"),
      description: t("expiredDescription"),
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  if (resolvedShare.status === "retired") {
    return {
      title: t("retiredTitle"),
      description: t("retiredDescription"),
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  if (resolvedShare.status !== "available") {
    return {
      title: t("title"),
      description: t("description"),
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
