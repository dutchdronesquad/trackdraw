import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import PublicGalleryGrid from "@/components/gallery/PublicGalleryGrid";
import { Footer } from "@/components/landing/Footer";
import { PublicSiteHeader } from "@/components/landing/PublicSiteHeader";
import { listPublicGalleryEntries } from "@/lib/server/gallery";
import LanguageProvider from "@/i18n/LanguageProvider";
import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
  SITE_AUTHOR,
  getSiteMediaUrl,
  getSiteUrl,
  serializeJsonLd,
} from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  const title = t("gallery.metaTitle");
  const description = t("gallery.metaDescription");
  const socialTitle = t("gallery.metaTitle");
  return {
    title,
    description,
    authors: [SITE_AUTHOR],
    alternates: {
      canonical: "/gallery",
    },
    openGraph: {
      title: socialTitle,
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
      title: socialTitle,
      description,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
  };
}

function resolveRequestHost(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  if (forwardedHost) {
    return forwardedHost.split(",")[0]?.trim().toLowerCase() ?? "";
  }

  return requestHeaders.get("host")?.trim().toLowerCase() ?? "";
}

export default async function GalleryPage() {
  const t = await getTranslations("landing");
  const description = t("gallery.metaDescription");
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }}
      />

      <LanguageProvider namespaces={["common", "landing"]}>
        <div className="bg-background min-h-screen overflow-x-clip">
          <PublicSiteHeader currentPage="gallery" />

          <main>
            <section className="mx-auto max-w-6xl px-4 pt-8 pb-6 sm:px-6 sm:pt-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {t("gallery.sectionLabel")}
                  </h1>
                  <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
                    {t("gallery.introduction")}
                  </p>
                </div>
                <Button asChild className="shrink-0 self-start sm:self-auto">
                  <Link
                    href="/studio?dialog=share&section=gallery"
                    prefetch={false}
                  >
                    {t("gallery.contribute")}
                  </Link>
                </Button>
              </div>
            </section>

            <section
              id="gallery-grid"
              className="relative mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16"
            >
              <PublicGalleryGrid
                entries={entries}
                mediaBaseUrl={mediaBaseUrl}
              />
            </section>
          </main>

          <Footer />
        </div>
      </LanguageProvider>
    </>
  );
}
