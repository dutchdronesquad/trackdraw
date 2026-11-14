import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import vinext from "vinext";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@opennextjs\/cloudflare$/,
        replacement: fileURLToPath(
          new URL(
            "./src/lib/server/vinext-cloudflare-context.ts",
            import.meta.url
          )
        ),
      },
    ],
  },
  plugins: [
    vinext(),
    cloudflare({
      configPath: "wrangler.vinext.jsonc",
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
