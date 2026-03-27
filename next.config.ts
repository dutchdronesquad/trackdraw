import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["trackdraw.home.arpa"],
};

initOpenNextCloudflareForDev();

export default nextConfig;
