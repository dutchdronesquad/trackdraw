import type { Metadata } from "next";
import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
} from "@/lib/seo";
import LanguageProvider from "@/i18n/LanguageProvider";

export const metadata: Metadata = {
  title: "Drone Race Track Builder",
  description:
    "Open the TrackDraw drone race track builder to design FPV layouts to scale, add gates and obstacles, and preview track flow in 3D.",
  alternates: {
    canonical: "/studio",
  },
  openGraph: {
    title: "TrackDraw | Drone Race Track Builder",
    description:
      "Design FPV drone race tracks to scale, add gates and obstacles, and preview track flow in 3D.",
    url: "/studio",
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
    title: "TrackDraw | Drone Race Track Builder",
    description:
      "Design FPV drone race tracks to scale, add gates and obstacles, and preview track flow in 3D.",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider
      namespaces={[
        "common",
        "dialogs",
        "editor",
        "exportPdf",
        "inspector",
        "setupEstimate",
        "shapes",
      ]}
    >
      <div style={{ "--radius": "0.375rem" } as React.CSSProperties}>
        {children}
      </div>
    </LanguageProvider>
  );
}
