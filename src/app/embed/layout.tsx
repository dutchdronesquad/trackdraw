import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Embed",
  description: "Embedded TrackDraw read-only track view.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
