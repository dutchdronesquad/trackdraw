import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["trackdraw.home.arpa"],
  turbopack: {},
  webpack(config, { isServer, webpack }) {
    if (isServer) {
      // The SDK statically imports its Node validator even when our MCP server
      // supplies the Worker validator. Keep one validator in server builds.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /@modelcontextprotocol[\\/]sdk[\\/]dist[\\/](esm|cjs)[\\/]validation[\\/]ajv-provider\.js$/,
          path.resolve("src/lib/server/mcp/cloudflare-validator.ts")
        )
      );
    }
    return config;
  },
};

if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
  initOpenNextCloudflareForDev({ environment: "dev" });
}

export default withNextIntl(nextConfig);
