import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import ThemeBootstrap from "@/components/ThemeBootstrap";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
  DEFAULT_OG_IMAGE_ALT,
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  getSiteUrl,
} from "@/lib/seo";
import {
  parseResolvedTheme,
  parseThemePreference,
  RESOLVED_THEME_COOKIE,
  resolveTheme,
  THEME_COOKIE,
  type ResolvedTheme,
} from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  title: { default: SITE_TITLE, template: "%s · TrackDraw" },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [SITE_AUTHOR],
  creator: SITE_AUTHOR.name,
  publisher: SITE_AUTHOR.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0c0f",
};

function getInitialTheme(
  preferenceCookie: string | undefined,
  resolvedCookie: string | undefined
): ResolvedTheme {
  const preference = parseThemePreference(preferenceCookie);
  const resolved = parseResolvedTheme(resolvedCookie);

  if (preference === "light" || preference === "dark") {
    return preference;
  }

  if (resolved) {
    return resolved;
  }

  return resolveTheme("system", false);
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialTheme = getInitialTheme(
    cookieStore.get(THEME_COOKIE)?.value,
    cookieStore.get(RESOLVED_THEME_COOKIE)?.value
  );

  return (
    <html
      lang="en"
      className={initialTheme === "dark" ? "dark" : undefined}
      style={{ colorScheme: initialTheme }}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeBootstrap />
        <TooltipProvider delay={500}>{children}</TooltipProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
