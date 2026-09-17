import { defineConfig } from "tsup";

export default defineConfig([
  // ESM npm build. Multi-entry so app-side/server code (e.g.
  // src/lib/track/viewer-snapshot.ts) can import light subpaths without
  // pulling React/three/konva into a server bundle.
  {
    entry: {
      index: "src/index.ts",
      mount: "src/mount.ts",
      "snapshot/types": "src/snapshot/types.ts",
      "snapshot/version": "src/snapshot/version.ts",
      "snapshot/schema": "src/snapshot/schema.ts",
      "assets/manifest": "src/assets/manifest.ts",
      "assets/texture-paths": "src/assets/texture-paths.ts",
      "assets/asset-url": "src/assets/asset-url.ts",
    },
    format: ["esm"],
    // dts generation is disabled: tsup auto-installs rollup-plugin-dts on
    // demand, pinned to a version whose internal TS Compiler API usage is
    // incompatible with this repo's TypeScript 7 (crashes with
    // "Cannot read properties of undefined (reading
    // 'useCaseSensitiveFileNames')" - a rollup-plugin-dts/TS7 compatibility
    // gap, not a config issue here). No .d.ts files ship in this build; not
    // a blocker for this issue (no npm publish yet, the app consumes
    // packages/viewer via the source TS path alias, not dist/), but a real
    // gap to close before an actual npm publish. Revisit once
    // rollup-plugin-dts (or tsup's bundled pin of it) supports TS7, or once
    // the deferred source-vendoring pass makes a plain `tsc --declaration`
    // emission viable (rootDir today reaches outside packages/viewer/src
    // into the app, which a non-bundling declaration emitter can't handle).
    dts: false,
    sourcemap: true,
    clean: true,
    outDir: "dist",
    platform: "browser",
    tsconfig: "./tsconfig.json",
    external: ["react", "react-dom", "react-dom/client"],
  },
  // Static browser build: a single self-contained global script for hosts
  // with no npm/bundler (e.g. a future RotorHazard plugin). React itself
  // must be bundled here since there is no npm environment on the host.
  {
    entry: { "trackdraw-viewer": "src/mount.ts" },
    format: ["iife"],
    globalName: "TrackDrawViewer",
    outDir: "dist/static",
    platform: "browser",
    minify: true,
    sourcemap: true,
    noExternal: [/.*/],
    tsconfig: "./tsconfig.json",
  },
]);
