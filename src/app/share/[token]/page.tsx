import { notFound } from "next/navigation";
import {
  getGalleryEntryByShareToken,
  isPublicGalleryState,
} from "@/lib/server/gallery";
import { resolveShareView } from "@/lib/server/share-resolution";
import {
  SITE_AUTHOR,
  getSiteMediaUrl,
  getSiteUrl,
  serializeJsonLd,
} from "@/lib/seo";
import { parseEditorView } from "@/lib/view";
import ShareViewer from "../ShareViewer";
import ShareError from "../ShareError";
import ShareExpired from "../ShareExpired";

type ShareTokenPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
    view?: string;
  }>;
};

function resolvePreviewImageUrl(previewImage: string | null | undefined) {
  if (!previewImage) return undefined;
  if (previewImage.startsWith("http")) return previewImage;

  return getSiteMediaUrl(previewImage);
}

export default async function ShareTokenPage({
  params,
  searchParams,
}: ShareTokenPageProps) {
  const { token } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const resolvedShare = await resolveShareView(token);

  if (resolvedShare.status === "available") {
    const galleryEntry =
      resolvedShare.source === "stored"
        ? await getGalleryEntryByShareToken(token)
        : null;
    const isPublicGalleryShare = isPublicGalleryState(
      galleryEntry?.galleryState
    );
    const trackJsonLd =
      isPublicGalleryShare && galleryEntry
        ? {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: galleryEntry.galleryTitle,
            description: galleryEntry.galleryDescription,
            url: `${getSiteUrl()}/share/${encodeURIComponent(token)}`,
            image: resolvePreviewImageUrl(galleryEntry.galleryPreviewImage),
            creator: {
              "@type": "Organization",
              name: SITE_AUTHOR.name,
              url: SITE_AUTHOR.url,
            },
            about: [
              "FPV drone race track",
              "drone race track builder",
              "drone racing layout",
            ],
            spatialCoverage: {
              "@type": "Place",
              name: `${resolvedShare.design.field.width} x ${resolvedShare.design.field.height} m field`,
            },
          }
        : null;

    return (
      <>
        {trackJsonLd ? (
          <script
            id="track-share-jsonld"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(trackJsonLd) }}
          />
        ) : null}
        <ShareViewer
          design={resolvedShare.design}
          studioSeedToken={resolvedShare.studioSeedToken}
          initialTab={parseEditorView(resolvedSearchParams?.view) ?? "2d"}
        />
      </>
    );
  }

  if (resolvedShare.status === "expired") {
    return <ShareExpired />;
  }

  if (resolvedShare.status === "revoked") {
    notFound();
  }

  if (resolvedShare.status === "retired") {
    return <ShareError />;
  }

  notFound();
}
