import type { Metadata } from "next";
import LanguageProvider from "@/i18n/LanguageProvider";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to TrackDraw with a one-time magic link.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider namespaces={["common", "login"]}>
      {children}
    </LanguageProvider>
  );
}
