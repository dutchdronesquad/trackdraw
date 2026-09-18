# @trackdraw/viewer Notice

Copyright 2026 Dutch Drone Squad

This directory is the extraction target for `@trackdraw/viewer`, licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full, unmodified license text — do not fill in or edit the Appendix placeholders in that file; this NOTICE and per-file headers carry the copyright attribution instead.

This is a deliberate exception to the rest of the repository: TrackDraw's editor and server are licensed `AGPL-3.0-only` (see the [repository root NOTICE](../../NOTICE.md)). Only the extracted viewer package uses Apache-2.0, so hosts such as FPVScores can depend on it as a normal npm package without AGPL's copyleft obligations reaching their own codebase. Do not relicense any other part of the repository based on this file.

## Status

The package is extracted, built, and self-contained: `src/` has no remaining source-level dependency on the main application's `src/` tree (issue #870 vendored the last pure app-internal helpers this package needs — 2D/3D catalog rendering, geometry, and shape utilities — as copies inside `packages/viewer/src/lib/` and `packages/viewer/src/components/`, each carrying this same Apache-2.0 header). `npm run viewer:build` from the repo root produces the ESM and static builds. Not yet published to npm — see [Track Viewer Package PVA](../../docs/pva/track-viewer-package-pva.md) for the phase plan, including the planned move to its own repository (`dutchdronesquad/track-viewer`).

## Third-Party Assets

`@trackdraw/viewer` must not bundle MultiGP-branded catalog textures (any texture path under `multigp-obstacles/`, equivalently any catalog entry with `organization: "MultiGP"` in [`src/lib/track/elements/catalog.ts`](../../src/lib/track/elements/catalog.ts)). Per [`docs/assets/multigp-obstacle-asset-workflow.md`](../../docs/assets/multigp-obstacle-asset-workflow.md), "MultiGP names, obstacle artwork, and related branding belong to MultiGP" — that source documents TrackDraw's own use of the artwork, not a redistribution license for a permissively licensed package any third party can install and redistribute further. See the asset inventory decision in the [PVA](../../docs/pva/track-viewer-package-pva.md#phase-0-confirm-distribution-fit) for how these textures are still resolved (at runtime/export time, not bundled with the installed package).

## Source File Header

Once extraction begins, prefix new source files in this package with:

```
// Copyright 2026 Dutch Drone Squad
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
```

Do not copy this header into files that stay in the AGPL-3.0-only application; it applies only inside `packages/viewer/`.
