import { execFileSync } from "node:child_process";

const [target = "local", ...args] = process.argv.slice(2);
if (args.length || !["local", "dev", "production"].includes(target)) {
  throw new Error("Usage: npm run build:vinext -- [local|dev|production]");
}

const production = target === "production";
const siteUrl =
  target === "local"
    ? "http://localhost:8787"
    : production
      ? "https://trackdraw.app"
      : "https://dev.trackdraw.app";

execFileSync("npm", ["run", "i18n:sync-assets"], { stdio: "inherit" });
execFileSync("vite", ["build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    CLOUDFLARE_ENV: production ? "" : "dev",
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_PUBLIC_APP_ENV: production ? "production" : "development",
  },
});
