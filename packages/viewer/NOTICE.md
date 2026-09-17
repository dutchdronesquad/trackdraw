# @trackdraw/viewer Notice

This directory is the extraction target for `@trackdraw/viewer`, licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full license text.

This is a deliberate exception to the rest of the repository: TrackDraw's editor and server are licensed `AGPL-3.0-only` (see the [repository root NOTICE](../../NOTICE.md)). Only the extracted viewer package uses Apache-2.0, so hosts such as FPVScores can depend on it as a normal npm package without AGPL's copyleft obligations reaching their own codebase. Do not relicense any other part of the repository based on this file.

## Status

This is a Phase 0 scaffold, not the extracted package. Extraction code, the framework-neutral mount API, and the npm/static builds land in later phases — see [Track Viewer Package PVA](../../docs/pva/track-viewer-package-pva.md).

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
