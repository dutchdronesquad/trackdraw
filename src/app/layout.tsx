import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeBootstrap from "@/components/ThemeBootstrap";
import { TooltipProvider } from "@/components/ui/tooltip";
import ThemedToaster from "@/components/ThemedToaster";
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
  RESOLVED_THEME_COOKIE,
  THEME_COOKIE,
  getInitialResolvedTheme,
} from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  title: { default: SITE_TITLE, template: "%s · TrackDraw" },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [SITE_AUTHOR],
  creator: SITE_AUTHOR.name,
  publisher: SITE_AUTHOR.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      {
        url: "/assets/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/assets/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/assets/pwa/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export async function generateViewport(): Promise<Viewport> {
  const cookieStore = await cookies();
  const initialTheme = getInitialTheme(
    cookieStore.get(THEME_COOKIE)?.value,
    cookieStore.get(RESOLVED_THEME_COOKIE)?.value
  );

  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: initialTheme === "dark" ? "#0c0f14" : "#f8fafc",
  };
}

const getInitialTheme = getInitialResolvedTheme;

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeBootstrap />
        <TooltipProvider delay={500}>{children}</TooltipProvider>
        <ThemedToaster />
      </body>
    </html>
  );
}
