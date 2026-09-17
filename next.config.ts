import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["trackdraw.home.arpa"],
  async rewrites() {
    return [
      // Serves catalog assets under a non-root prefix so the viewer
      // extraction spike (src/app/dev/viewer-spike) can prove the
      // assetsBaseUrl option resolves textures correctly without a
      // second real deployment. See issue #859.
      {
        source: "/dev/viewer-spike/assets-prefix-demo/assets/:path*",
        destination: "/assets/:path*",
      },
    ];
  },
};

if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
  initOpenNextCloudflareForDev({ environment: "dev" });
}

export default withNextIntl(nextConfig);
