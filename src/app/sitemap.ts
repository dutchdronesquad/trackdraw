import type { MetadataRoute } from "next";
import { listPublicGalleryEntries } from "@/lib/server/gallery";
import { getSiteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const galleryEntries = await listPublicGalleryEntries(100).catch(() => []);

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/gallery`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/studio`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...galleryEntries.map((entry) => ({
      url: `${siteUrl}/share/${encodeURIComponent(entry.shareToken)}`,
      lastModified: new Date(
        entry.galleryPublishedAt ?? entry.updatedAt ?? entry.createdAt
      ),
      changeFrequency: "weekly" as const,
      priority: entry.galleryState === "featured" ? 0.75 : 0.65,
    })),
  ];
}
