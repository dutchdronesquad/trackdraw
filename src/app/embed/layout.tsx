import type { Metadata } from "next";
import LanguageProvider from "@/i18n/LanguageProvider";

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
  return (
    <LanguageProvider namespaces={["common", "editor", "share"]}>
      {children}
    </LanguageProvider>
  );
}
