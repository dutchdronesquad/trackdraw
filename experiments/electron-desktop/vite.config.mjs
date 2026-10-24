import { defineConfig } from "vite";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, copyFile } from "node:fs/promises";
import { assetOrigin, prepareAssets } from "./assets.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const requireRoot = createRequire(path.join(root, "package.json"));
const { buildManifest, manifestName } = createRequire(import.meta.url)(
  "./offline-assets.cjs"
);
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
        // Keep the exact existing artwork; macOS icons need transparent outer
        // space rather than the edge-to-edge canvas used by the web icon.
        const sharp = requireRoot("sharp");
        const iconDirectory = path.join(here, "dist/assets/desktop");
        await mkdir(iconDirectory, { recursive: true });
        await sharp(path.join(root, "public/assets/pwa/icon-512.png"))
          .resize(824, 824)
          .extend({
            top: 100,
            bottom: 100,
            left: 100,
            right: 100,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toFile(path.join(iconDirectory, "icon-macos.png"));
        const { writeFile } = await import("node:fs/promises");
        await writeFile(
          path.join(here, "dist", manifestName),
          JSON.stringify(buildManifest(path.join(here, "dist")))
        );
      },
    },
  ],
  resolve: {
    dedupe: ["react", "react-dom", "three", "zustand"],
    alias: [
      { find: "@/store/editor", replacement: shim("editor-store.jsx") },
      {
        find: "@/components/canvas/useTrackCanvasViewport",
        replacement: shim("viewport.jsx"),
      },
      {
        find: "@/components/canvas/preview3d/shared-scene",
        replacement: shim("scene.jsx"),
      },
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
