import type { Metadata } from "next";
import LanguageProvider from "@/i18n/LanguageProvider";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function McpLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider namespaces={["common", "login"]}>
      {children}
    </LanguageProvider>
  );
}
