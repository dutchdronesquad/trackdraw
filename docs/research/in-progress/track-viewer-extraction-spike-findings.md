# Track Viewer Extraction Spike — Findings

Date: September 17, 2026

Status: Phase 1 spike complete (issue [#859](https://github.com/dutchdronesquad/trackdraw/issues/859)). Feeds the finalized allowlist/versioning decision recorded in [the PVA](../../pva/track-viewer-package-pva.md#phase-1-prove-viewer-extraction-and-snapshot-fidelity).

## What was built

A framework-neutral `TrackViewer` (`packages/viewer/src/`) extracted from `TrackCanvas.tsx`/`TrackPreview3D.tsx`/`EditorShell.tsx`, taking a plain `TrackDesign` prop instead of reading the global editor Zustand store, with `next-intl` replaced by an injectable label table, `useMeasurementUnitSystem`/`useTheme` replaced by props, and `next/navigation`/`next/dynamic` dropped entirely (a plain `React.lazy` loads the 3D chunk on demand). A chrome-less host route at `/dev/viewer-spike` (no `EditorShell`, `Header`, `MobilePanels`, or auth) mounts three simultaneous instances against two representative designs.

Scope cut from Phase 1 (recorded, not silent): flythrough is not extracted — `FlyThroughControlsOverlay` and `TrackPreview3DHintOverlays` are both `next-intl`-coupled and the issue's acceptance criteria only require orbit/pan/zoom controls. `usePerfMetric` (dev telemetry) is also dropped, matching the PVA's "no analytics callback in the distributed package" commitment.

## Network/asset request inventory

For `buildMultiOrgDesign()` (one TrackDraw-owned gate, one MultiGP-owned gate, a MultiGP hurdle, a cone, a label, and an elevation-varying polyline route):

| Request                                                     | Trigger                                                                                 | Notes                                                                                                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js JS chunk for `viewer-3d/TrackViewer3D`              | First 3D tab visit, or an 800ms idle timer after mount                                  | Same on-demand pattern as the editor's `EditorShell`; confirmed via `React.lazy` + `Suspense`, no `next/dynamic` dependency                                                       |
| `standard-gate-5x5` MultiGP textures (left/right/top panel) | `useTexture()` inside the package's `Gate3D.tsx`, only when that shape is in the design | Scoped by `getDesignTexturePaths(shapes)`, not the whole catalog                                                                                                                  |
| `5x10-hurdle-multigp.webp`                                  | `useTexture()` inside `Barrier3D.tsx`                                                   | Same design-scoped path                                                                                                                                                           |
| `trackdraw-logo-mono-{lightbg,darkbg}.svg`                  | `FieldWatermark`'s `<img>` preload, on 3D mount                                         | Routed through `assetResolver` like every other texture path — this was **not** covered by the original `getTrackElementCatalogTexturePaths()` inventory, found during extraction |
| **Nothing else**                                            | —                                                                                       | No font fetch, no analytics/telemetry beacon, no `next-intl` locale JSON, no editor-store hydration call, no TrackDraw API call of any kind                                       |

Confirmed the design-scoped fix works: a `TrackDraw`-only design (no MultiGP shapes) produces **zero** texture requests until a MultiGP or TrackDraw-branded-texture shape is actually present — verified in `packages/viewer/tests/assets/texture-paths.test.ts`, which regression-guards that `getDesignTexturePaths` returns exactly the entries a design uses, not the full 24-entry catalog the editor's `getTrackElementCatalogTexturePaths()` still (correctly, for its own eager-warm use case) walks in full.

**Non-root URL prefix**, verified end-to-end via a `next.config.ts` rewrite (`/dev/viewer-spike/assets-prefix-demo/assets/:path*` → `/assets/:path*`) plus a `TrackViewer assetsBaseUrl="/dev/viewer-spike/assets-prefix-demo"` instance on the spike page:

```
curl .../assets/models/textures/multigp-obstacles/5x10-hurdle-multigp.webp        → 200, 28334 bytes
curl .../dev/viewer-spike/assets-prefix-demo/assets/.../5x10-hurdle-multigp.webp  → 200, 28334 bytes (identical)
```

**Deliberately shared, not isolated:** drei's `useTexture` cache is a module-level `Map` keyed by the _resolved_ URL string. Two `TrackViewer` instances on one page rendering the same catalog obstacle share one decoded texture instead of double-fetching — correct behavior (it's an asset cache keyed by URL, not by design/editor state), but worth recording explicitly rather than leaving ambiguous. No other module-level mutable state was found in the extracted render path with one exception: `src/components/canvas/preview3d/texture-debug.ts`'s dev-only texture-orientation override store, reused as-is (unmodified, pure, in-memory) because it never receives writes outside a dev-only debug UI that the extracted package does not include — inert for this package's purposes.

## Multi-instance isolation

No global store read anywhere in the new `packages/viewer/src/**` components — confirmed by construction (every former `useEditor`/`store/selectors` read became a `design` prop or a pure derived-from-`design` helper in `design-derived.ts`). `@react-three/fiber`'s `<Canvas>` already isolates its own WebGL context/renderer/scene per mount. The spike page's Instance A/B render two different designs with different `theme`/`unitSystem` props side by side specifically to make any state leak visually obvious on manual review.

## WebGL fallback

No WebGL capability check existed anywhere in the codebase before this spike (confirmed by a repo-wide grep). `packages/viewer/src/capabilities/webgl.ts` adds `detectWebglSupport()` (tries `webgl2` → `webgl` → `experimental-webgl`, returns `"unsupported"` on any failure or non-browser environment) and `TrackViewer` gates the entire 3D tab/toggle behind it. Spoofing an actual browser's WebGL absence was out of scope for a spike (decided with the user: no new browser-automation tooling), so the fallback path is exercised via a `forceWebglUnsupported` prop instead — wired to a checkbox on the spike page's Instance A.

## Allowlist and `required_viewer` versioning — finalized

See `packages/viewer/src/snapshot/types.ts`, `packages/viewer/src/snapshot/version.ts`, and the app-side mapper `src/lib/track/viewer-snapshot.ts` for the implementation; the PVA's Phase 1 checklist links here.

**Allowlist rule:** `toViewerDesignSnapshot(design)` explicitly excludes `id` (replaced by a fresh `snapshotId`), `authorName`, `inventory`, `tags`, `description`, `mapReference`, `createdAt`, the internal `shapeOrder`/`shapeById` maps (flattened to `shapes[]`), and every `shape.meta` key except `catalog`. This tightens `serializeDesignForShare`'s precedent per the PVA's own note that it "still carries fields that must be explicitly excluded."

**`required_viewer` versioning rule:** additive-safe, floor-gated. `minRendererVersion` is a semver floor (installed renderer must be `>=`); `capabilities` is a required-subset check (the installed renderer's capability set must be a superset of the snapshot's, so new shape kinds can ship without invalidating old snapshots, and old snapshots stay renderable by newer renderers). A `schema` mismatch is always incompatible — no cross-schema negotiation in v1.

One naming note versus the research doc's proposed envelope: this implementation uses `snapshotId`/`requiredViewer` (camelCase, this being TypeScript) where the research doc sketches `snapshot_id`/`required_viewer` (snake_case, as it would appear on an eventual wire/JSON envelope). Phase 2's actual `viewer-snapshot` API route is where the wire-format casing gets decided; nothing here forecloses that.

## Verified

- `npm run lint`, `tsc --noEmit`, and the full `vitest` suite (1067 tests, 200 files) pass with the extraction in place.
- 19 new tests cover `detectWebglSupport`, `createAssetResolver`, `getDesignTexturePaths` (the core eager-preload regression guard), `toViewerDesignSnapshot`'s allowlist, and `isViewerCompatible`'s versioning rule.
- The spike route compiles and serves `200` in dev, and the asset-prefix rewrite serves identical bytes under both the root and prefixed path.
- **Not verified in this pass:** pixel-level 2D/3D visual parity against the existing editor viewer, and interactive desktop/mobile control behavior — no browser-automation tool was available in this session. Per the decision made before starting this spike, that comparison is a manual step: run `npm run dev`, open `/dev/viewer-spike` next to the editor with the same fixture shapes (see `src/app/dev/viewer-spike/fixtures.ts`), and confirm 2D/3D rendering, obstacle numbering, pan/zoom, and orbit controls match.
