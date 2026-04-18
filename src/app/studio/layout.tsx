import type { Metadata } from "next";
import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Design your FPV race track to scale, add gates and obstacles, and preview in 3D.",
  openGraph: {
    title: "TrackDraw Studio",
    description:
      "Design your FPV race track to scale, add gates and obstacles, and preview in 3D.",
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
    title: "TrackDraw Studio",
    description:
      "Design your FPV race track to scale, add gates and obstacles, and preview in 3D.",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ "--radius": "0.375rem" } as React.CSSProperties}>
      {children}
    </div>
  );
}
