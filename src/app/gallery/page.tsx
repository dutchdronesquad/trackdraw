import type { Metadata } from "next";
import { headers } from "next/headers";
import PublicGalleryGrid from "@/components/gallery/PublicGalleryGrid";
import { Footer } from "@/components/landing/Footer";
import { PublicSiteHeader } from "@/components/landing/PublicSiteHeader";
import { listPublicGalleryEntries } from "@/lib/server/gallery";
import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
  SITE_AUTHOR,
  getSiteMediaUrl,
  getSiteUrl,
} from "@/lib/seo";

const title = "Gallery — TrackDraw";
const description =
  "Browse FPV drone race track designs shared by the TrackDraw community.";

export const metadata: Metadata = {
  title,
  description,
  authors: [SITE_AUTHOR],
  alternates: {
    canonical: "/gallery",
  },
  openGraph: {
    title,
    description,
    url: "/gallery",
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
    title,
    description,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

function resolveRequestHost(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  if (forwardedHost) {
    return forwardedHost.split(",")[0]?.trim().toLowerCase() ?? "";
  }

  return requestHeaders.get("host")?.trim().toLowerCase() ?? "";
}

export default async function GalleryPage() {
  const requestHeaders = new Headers(await headers());
  const entries = await listPublicGalleryEntries();
  const requestHost = resolveRequestHost(requestHeaders);
  const configuredSiteHost = new URL(getSiteUrl()).host.toLowerCase();
  const mediaBaseUrl =
    requestHost && requestHost === configuredSiteHost
      ? getSiteMediaUrl("")
      : "/api/media";
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "TrackDraw Gallery",
    description,
    url: `${getSiteUrl()}/gallery`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: entries.length,
      itemListElement: entries.slice(0, 24).map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${getSiteUrl()}/share/${entry.shareToken}`,
        name: entry.galleryTitle,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <div className="bg-background min-h-screen overflow-x-clip">
        <PublicSiteHeader currentPage="gallery" />

        <main>
          <section className="relative pb-10 sm:pb-14">
            <div className="pointer-events-none absolute -top-32 left-0 h-150 w-150 rounded-full bg-[#1E93DB] opacity-[0.06] blur-[120px]" />

            <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
                  Gallery
                </p>
                <h1 className="mt-4 text-[clamp(34px,9vw,56px)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance sm:leading-[1.08]">
                  <span className="block">Discover layouts that shape</span>
                  <span className="from-brand-primary mt-1.5 block bg-linear-to-r to-sky-300 bg-clip-text text-transparent sm:mt-0">
                    your next track design.
                  </span>
                </h1>
                <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-[15px] leading-7">
                  Browse public TrackDraw layouts shared by the community for
                  inspiration. Featured tracks surface the strongest examples
                  first, with recent community uploads right below.
                </p>
              </div>
            </div>
          </section>

          <section
            id="gallery-grid"
            className="relative z-20 mx-auto -mt-8 max-w-6xl px-4 pb-12 sm:-mt-10 sm:px-6 sm:pb-16"
          >
            <PublicGalleryGrid entries={entries} mediaBaseUrl={mediaBaseUrl} />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
