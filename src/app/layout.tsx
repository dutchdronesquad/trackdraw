import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  title: "TrackDraw",
  description: "TrackDraw – ontwerp FPV race tracks met schaal, hoogteprofiel en exports.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // inline script om FOUC te voorkomen bij dark mode
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{const LS_KEY='trackdraw.theme';let m=localStorage.getItem(LS_KEY);if(!m){m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(m==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] transition-colors`}
      >
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
