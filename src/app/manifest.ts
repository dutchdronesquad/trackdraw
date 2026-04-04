import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/studio",
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/studio",
    scope: "/",
    display: "standalone",
    background_color: "#0c0f14",
    theme_color: "#0c0f14",
    categories: ["productivity", "utilities", "sports"],
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/assets/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/assets/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/assets/pwa/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Open Studio",
        short_name: "Studio",
        description: `${SITE_TAGLINE} editor`,
        url: "/studio",
        icons: [
          {
            src: "/assets/pwa/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "View Site",
        short_name: "Site",
        description: "Open the TrackDraw landing page",
        url: "/",
        icons: [
          {
            src: "/assets/pwa/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
