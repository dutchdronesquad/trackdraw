# Worker build size

Date: October 3, 2026

Status: Webpack trial enabled in the production build script. Deployment and browser acceptance remain pending.

## Finding

The initial Turbopack artifact approached TrackDraw's own 9 MiB uncompressed handler guardrail and exceeded its own development gzip warning threshold. These are repository guardrails, not the current Cloudflare platform limits. Cloudflare removed the old 3 MB Free / 10 MB Paid compressed limits on September 4, 2026; the current platform limit is 64 MiB uncompressed for both plans. Smaller bundles remain useful for startup and deployment overhead. [Cloudflare announcement](https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/), [current limits](https://developers.cloudflare.com/workers/platform/limits/#worker-size).

The [OpenNext troubleshooting page](https://opennext.js.org/cloudflare/troubleshooting) still describes the historical compressed limits. Its bundle-analysis advice remains useful, but its size-limit numbers conflict with the newer Cloudflare announcement and current platform documentation. An actual deployment rejection should be assessed against its exact error and upload payload; this analysis does not demonstrate a platform rejection.

The clearest reduction candidates are server chunk boundaries and repeated validation code. First repeat the measured Webpack comparison under controlled CI conditions, then address the viewer package's embedded Zod copy. Three.js, media encoding, and charts are obvious large browser libraries, but they do not appear among the largest measured server contributors. A broad frontend rewrite is not justified by this evidence.

## Measurement boundary

Measure the deployed Worker separately from browser assets. TrackDraw's [Wrangler configuration](../../../wrangler.jsonc) starts at [custom-worker.ts](../../../custom-worker.ts), which imports OpenNext and scheduled cleanup. `.open-next/assets` contains separately served browser/static files. The complete bundled upload therefore differs from `.open-next/server-functions/default/handler.mjs` alone.

| Measurement                      | Value                                      | Boundary                                                                                                                                  |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Repository HEAD                  | `585eb20351ea5dc5f2047d0209add5daeffc1907` | Clean `main` at analysis start                                                                                                            |
| Existing OpenNext handler        | 9,221,663 B raw / 2,295,995 B gzip         | Existing artifact built October 3 at 20:55 local time; gzip measured with Node's default compression                                      |
| Production Wrangler dry run      | 9,078.35 KiB raw / 2,402.29 KiB gzip       | Complete upload from existing build artifacts; Wrangler 4.143.0, root production minification                                             |
| Fresh Turbopack build            | Blocked by environment                     | Port creation failed with `EPERM`, including the escalated attempt; existing artifacts are not a freshly reproduced exact-source baseline |
| Fresh Webpack/OpenNext handler   | 7,215,441 B raw / 1,808,593 B gzip         | Fresh standalone Webpack build followed by OpenNext `--skipNextBuild`; unchanged source/dependencies                                      |
| Fresh Webpack production dry run | 6,876.73 KiB raw / 1,848.42 KiB gzip       | Complete upload with the production Wrangler configuration                                                                                |
| Retained Webpack trial dry run   | 6,876.73 KiB raw / 1,848.39 KiB gzip       | Normal complete OpenNext build using the updated shared script, without the standalone workaround                                         |
| Webpack with Zod externalized    | 7,197.68 KiB raw / 1,912.29 KiB gzip       | Complete upload; adds 63.87 KiB gzip (+3.5%) versus the fresh Webpack baseline                                                            |
| Production CI guard              | 9 MiB raw                                  | Handler only; see [production workflow](../../../.github/workflows/deploy-prod.yaml)                                                      |
| Development CI warning           | 2,200 KiB gzip                             | Handler only; see [development workflow](../../../.github/workflows/deploy-dev.yaml)                                                      |

Installed versions were Next.js 16.3.6, OpenNext Cloudflare 1.20.6, OpenNext AWS 4.1.4, Wrangler 4.143.0, Zod 4.6.5, Better Auth 1.7.6, and `@trackdraw/viewer` 1.0.0. These are resolved installed versions, rather than the minimum versions in `package.json`.

The existing handler is 8.794 MiB raw, leaving about 206 KiB under the repository's 9 MiB guard. The full dry-run upload is about 8.866 MiB raw / 2.346 MiB gzip. Node gzip, command-line gzip, and Wrangler gzip can differ; do not compare them as if they were the same measurement. Prefer one repeated production dry-run command for before/after totals.

The fresh Webpack fallback measured 24.3% less raw complete-upload size and 23.0% less gzip size than the existing Turbopack artifact, at unchanged source/dependencies. This is an indicative comparison: Turbopack could not be rebuilt in this environment, so it is not a fully controlled fresh-versus-fresh experiment. The Webpack route output preserves the four static public shells and dynamic auth/gallery/API boundaries. Local Cloudflare preview checks subsequently passed; a controlled CI comparison and deployed runtime verification remain pending.

```bash
npx opennextjs-cloudflare build
npx wrangler deploy --env "" --dry-run --outdir /tmp/trackdraw-worker-size-baseline --metafile /tmp/trackdraw-worker-size-baseline/meta.json
```

The fallback was built with `NEXT_PRIVATE_STANDALONE=true npm run build -- --webpack`, followed by `npx opennextjs-cloudflare build --skipNextBuild`. That private Next build-mode environment variable is a local research workaround for producing the standalone output OpenNext needs; any retained deployment change should use the adapter's normal build flow with an explicit Next Webpack build command.

The isolated app configuration trial added `serverExternalPackages: ["zod"]` to `next.config.ts`, repeated the same Webpack/OpenNext/dry-run sequence, and increased complete-upload gzip by 3.5%. Its handler was 7,646,543 B raw / 1,878,448 B Node gzip. OpenNext still included 603,998 emitted bytes from the external Zod package. This setting was removed after measurement; it is not recommended from the observed Webpack result. Its effect on Turbopack remains unmeasured. Final local generated outputs were rebuilt with the original configuration using Webpack.

## Retained Webpack trial

The shared `build` script now selects `next build --webpack`. Both deployment workflows and `npm run preview` use the normal OpenNext build, which calls this script. The trial therefore does not depend on private standalone environment variables or skipping the Next build. Local development continues to use its existing Turbopack script. The research remains in progress because the controlled Turbopack comparison, deployed runtime checks, and browser/mobile acceptance have not been completed.

Validation passed: Oxlint, all 1,237 tests across 210 files, route type generation/TypeScript, the full OpenNext build, and the production Wrangler dry run. The normal build reproduced the smaller bundle and preserved the static public shell route boundary.

Local Cloudflare preview was started outside the sandbox because local port binding is restricted inside it. HTTP checks verified the four public shells, login, gallery, the dashboard login redirect, anonymous account/auth session responses, the auth health endpoint, REST unauthorized response, OpenAPI, locale assets, missing share handling, and the missing-track embed message. The auth check initially exposed unapplied local migrations; applying the existing local migrations corrected it without an auth code change. These checks do not cover signing in, passkey enrollment, authenticated writes, valid shared-track interactions, scheduled cleanup, or browser/mobile editing.

Wrangler's documented dry-run reports `Total Upload` and `gzip` without deployment. OpenNext recommends inspecting `handler.mjs.meta.json` with an esbuild analyzer to attribute the server output. Input sizes and source-map coverage identify likely contributors; neither directly proves the gzip bytes that would disappear after a change. [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/#worker-size), [OpenNext troubleshooting](https://opennext.js.org/cloudflare/troubleshooting).

## Local attribution

Source-map attribution of the existing build identifies these server chunks:

| Contributor                        | Observed emitted bytes  | Interpretation                                                                                                      |
| ---------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Two Zod core chunks                | 160,272 B each          | Exactly duplicated chunk size across SSR/RSC output; test final bundling ownership before changing schema semantics |
| Zod classic/compile/locales chunks | 333,805 B and 335,964 B | Broad Zod exports appear in both server graphs                                                                      |
| Viewer snapshot chunk              | 551,742 B               | 469,182 B attributed to published viewer `dist/chunk-OVA55FVH.js`, which embeds its own Zod implementation          |
| Auth chunk                         | 676,203 B               | Passkey dependency chain includes X.509/ASN.1 and reflection code; auth is a real product feature                   |

These rows are diagnostic chunks, not independently additive savings estimates. The viewer chunk itself includes validation code, and gzip compresses repeated text.

TrackDraw already uses narrow viewer entry points in [viewer-snapshot.ts](../../../src/lib/track/viewer-snapshot.ts), including `snapshot/schema`, `snapshot/types`, and `assets/manifest`. The viewer package's current ESM build bundles all dependencies with `noExternal: [/.*/]`; its schema entry consequently imports a prebundled Zod chunk containing broad exports, locales, compilation and JSON-schema machinery. This is a package-output opportunity, rather than a missed root-import cleanup in TrackDraw. Inspect the sibling `track-viewer` repository's `tsup.config.ts` and the installed `@trackdraw/viewer` 1.0.0 output when implementing it.

An isolated esbuild experiment on the viewer's `src/snapshot/schema.ts` produced 456,186 B raw / 93,783 B gzip when bundling Zod, versus 3,153 B raw / 1,277 B gzip when externalizing `zod`. The installed vendor chunk is 469,182 B raw / 97,547 B gzip. This confirms the package boundary's size contribution, but the isolated delta is not a measured full Worker saving: the consumer still needs its shared Zod runtime, and other viewer entry points may retain the vendor chunk. Preserve standalone browser artifacts and test a separate consumer-friendly snapshot ESM output before committing to this package change.

## Options, ordered by evidence

| Option                                                                                    | Why it may help                                                                                                             | Risk and verification                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trial Webpack versus Turbopack output                                                     | Fresh Webpack fallback upload was 24.3% smaller raw and 23.0% smaller gzip than existing Turbopack output                   | Promising measured candidate, but the Turbopack baseline was not rebuilt. Repeat a controlled CI comparison and Cloudflare preview before retaining the deployment change                                                                                                                                   |
| Stop embedding Zod in the viewer's npm ESM snapshot entry points                          | Removes the independently prebundled copy and lets consumers share their installed validation dependency                    | Preserve the standalone browser/IIFE artifact. The current ESM output is deliberately standalone too; narrow server-friendly entries or separately configured snapshot output may be safer than externalizing every viewer dependency. Requires viewer build/tests/package verification and consumer update |
| Update CI sizing to report the complete production upload and a deliberate project budget | Gives a stable metric matching what deployment actually sends and avoids presenting old heuristics as platform limits       | Does not itself shrink the build. Retain an intentional internal budget and growth reporting rather than replacing it with 64 MiB indiscriminately                                                                                                                                                          |
| Trial `config.default.minify = true` before the final Cloudflare bundle                   | Applies the inherited OpenNext server-function minification pass, including copied `.js` and `.json`, before final bundling | More aggressive than the default Cloudflare pass; upstream warns some packages can break. Rebuild, compare totals, and preview auth/share/API/cron paths before keeping it                                                                                                                                  |
| App-level `serverExternalPackages: ["zod"]`                                               | Tested as a possible deduplication mechanism                                                                                | Rejected for the measured Webpack build: complete-upload gzip increased 3.5%. Do not apply without new evidence for the intended bundler                                                                                                                                                                    |

Next documents that `serverExternalPackages` opts dependencies out of its Server Component/Route Handler bundling. OpenNext documents this mechanism for packages with `workerd` exports: the package is left for the Cloudflare adapter to resolve. It is not a way to load arbitrary npm packages from the production host, nor an upstream guarantee of deduplication. Next also supports `next build --webpack` explicitly. [Next configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages), [OpenNext workerd exports](https://opennext.js.org/cloudflare/howtos/workerd), [Next CLI](https://nextjs.org/docs/app/api-reference/cli/next#next-build-options).

Zod Mini is a later schema migration option if duplication fixes leave validation prominent. Its functional API supports tree shaking better than classic Zod's methods, but it is not an import-only replacement and upstream examples are not TrackDraw savings estimates. Keep the schema acceptance/rejection contract and error responses covered before adopting it. [Zod Mini documentation](https://zod.dev/packages/mini).

## Minification details

Production [wrangler.jsonc](../../../wrangler.jsonc) already sets `minify: true`; `env.dev` deliberately sets it to `false`. Installed OpenNext Cloudflare 1.20.6 also enables its CLI Worker minification unless `--noMinify` is passed. Its final server bundle minifies whitespace and syntax while deliberately keeping identifiers intact. Therefore “enable minification” is not a missing production switch. [OpenNext CLI](https://opennext.js.org/cloudflare/cli), [adapter bundling source](https://github.com/opennextjs/opennextjs-cloudflare/blob/main/packages/cloudflare/src/cli/build/bundle-server.ts).

The separate inherited `default.minify` option defaults to false and invokes a prepass with JSON compression and identifier mangling. It is not accepted as a field inside the `defineCloudflareConfig({...})` argument. A correctly scoped experiment preserves the existing cache configuration and changes the returned config:

```ts
const config = defineCloudflareConfig({
  incrementalCache: staticShellCache,
  enableCacheInterception: true,
});

config.default = { ...config.default, minify: true };
export default config;
```

This is research guidance, not an implemented setting. It was checked against installed adapter types and implementation. [OpenNext common function options](https://opennext.js.org/aws/config/reference), [Cloudflare createServerBundle implementation](https://github.com/opennextjs/opennextjs-cloudflare/blob/main/packages/cloudflare/src/cli/build/open-next/createServerBundle.ts).

## Boundaries to retain

`"use client"` alone does not remove server prerendering. `next/dynamic` with `ssr: false` inside a Client Component skips it, but the outcome still depends on other imports retaining the same library. TrackDraw already applies this to the Studio editor, share/embed viewer shells, 3D and other heavy interactive leaves. The evidence does not support replacing public rendering with more blank client-only shells. [Next lazy-loading documentation](https://nextjs.org/docs/app/guides/lazy-loading), local [Studio page](../../../src/app/studio/page.tsx) and [ShareViewer](../../../src/app/share/ShareViewer.tsx).

`removeExternalMiddleware` is not present in the installed OpenNext Cloudflare/AWS config types or implementation, and no supporting current official documentation was found. Do not add it as a presumed optimization. TrackDraw has a small Edge `middleware.ts` for dashboard cookie-presence redirects. Removing it changes access/navigation behavior; converting it to Next 16 Node `proxy.ts` can grow the server runtime according to an upstream issue and merits a measured compatibility decision. [Local middleware](../../../middleware.ts), [upstream Node middleware bundle issue](https://github.com/opennextjs/opennextjs-cloudflare/issues/1373).

Do not remove passkeys, server validation, or account/share ownership checks to save bytes. Likewise, localization is already served through Static Assets on Cloudflare; moving translations out of the Worker is not an unimplemented optimization here. Keep the four static public shell cache keys and dynamic auth/gallery/share/embed/API routes as documented in [deployment setup](../../deployment/deployment-setup.md).

Splitting auth or cron into additional Workers is a possible platform-scale fallback, but adds deployment and binding coordination. The current evidence supports smaller packaging experiments first. [Cloudflare's size reduction options](https://developers.cloudflare.com/workers/platform/limits/#worker-size).

## Acceptance for any follow-up

Keep a fresh baseline and a production dry run for each isolated experiment. Report raw and gzip totals, package versions, source revision and any applied experiment. Run normal lint/type/tests/build checks for retained code changes and Cloudflare preview for auth, passkeys, D1-backed project/share/API reads, gallery, localization, and scheduled cleanup. Browser/mobile editor and read-only viewer interaction remain separate acceptance evidence. A dry run proves bundle generation and sizing; it does not prove deployed runtime startup or a successful production deployment.
