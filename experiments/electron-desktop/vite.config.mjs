import { defineConfig } from "vite";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, copyFile } from "node:fs/promises";
import { assetOrigin, prepareAssets } from "./assets.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const requireRoot = createRequire(path.join(root, "package.json"));
const shim = (name) => path.join(here, "renderer/shims", name);

export default defineConfig({
  root: here,
  publicDir: path.join(root, "public"),
  plugins: [
    {
      name: "desktop-poc-local-textures",
      async buildStart() {
        await prepareAssets();
      },
      transform(code, id) {
        if (/\/src\/lib\/track\/elements\/(catalog|visual)\.ts$/.test(id)) {
          return {
            code: code.replaceAll(assetOrigin, "/poc-assets/multigp/"),
            map: null,
          };
        }
      },
      async closeBundle() {
        const { cache, names } = await prepareAssets();
        const destination = path.join(here, "dist/poc-assets/multigp");
        await mkdir(destination, { recursive: true });
        await Promise.all(
          names.map((name) =>
            copyFile(path.join(cache, name), path.join(destination, name))
          )
        );
      },
    },
  ],
  resolve: {
    dedupe: ["react", "react-dom", "three", "zustand"],
    alias: [
      {
        find: "@/lib/projects",
        replacement: path.join(here, "renderer/storage/projects.mjs"),
      },
      {
        find: "@/hooks/editor/useEditorProjects",
        replacement: path.join(here, "renderer/storage/useDesktopProjects.jsx"),
      },
      { find: "@/lib/auth-client", replacement: shim("auth.mjs") },
      {
        find: "@/components/map-reference/MapReferenceDialog",
        replacement: shim("map-reference.jsx"),
      },
      { find: "next/navigation", replacement: shim("navigation.mjs") },
      { find: "next/dynamic", replacement: shim("dynamic.jsx") },
      { find: "next/link", replacement: shim("link.jsx") },
      { find: "next/image", replacement: shim("image.jsx") },
      { find: "@", replacement: path.join(root, "src") },
      { find: "@lang", replacement: path.join(root, "lang") },
    ],
  },
  define: {
    "process.env.NEXT_PUBLIC_APP_VERSION": JSON.stringify("desktop-alpha"),
    "process.env.NEXT_PUBLIC_COMMIT_SHA": JSON.stringify(""),
    "process.env.NEXT_PUBLIC_SITE_URL": JSON.stringify("https://trackdraw.app"),
  },
  css: {
    postcss: {
      plugins: [requireRoot("@tailwindcss/postcss")({ base: root })],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      onwarn(warning, warn) {
        // This bundle is entirely client-side; Next's module directives have no role here.
        if (
          ["MODULE_LEVEL_DIRECTIVE", "INEFFECTIVE_DYNAMIC_IMPORT"].includes(
            warning.code
          )
        )
          return;
        warn(warning);
      },
    },
  },
});
