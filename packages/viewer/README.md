# @trackdraw/viewer

Extracted, framework-neutral 2D/3D track viewer. `src/` holds the Phase 1 extraction (issue [#859](https://github.com/dutchdronesquad/trackdraw/issues/859)): `TrackViewer` takes a plain `design` prop, has no dependency on the editor's Zustand store, `next-intl`, or `next/navigation`, and is consumed today via a dev-only TypeScript path alias (`@trackdraw/viewer`, see `tsconfig.json`/`vitest.config.ts`) rather than a real npm package — there is still no `package.json` or build target here.

See [Track Viewer Package PVA](../../docs/pva/track-viewer-package-pva.md) for the phase plan and [the Phase 1 findings doc](../../docs/research/in-progress/track-viewer-extraction-spike-findings.md) for what the extraction proved:

- Phase 1 (done except manual visual-parity review) proved extraction, finalized the display-metadata allowlist (`src/snapshot/`), and fixed the eager whole-catalog texture preload.
- Phase 2 adds the actual `package.json`, ESM/static builds, and the shared snapshot builder.

The package stays in this repository through Phase 1 and Phase 2 (see the PVA's "New Surfaces" section for why) — this is not a permanent commitment, but a split is not planned unless Phase 2's build pipeline makes one clearly worth it.

A chrome-less host page exercising this package lives at `src/app/dev/viewer-spike/` in the main app.
