# Track Element Catalog

TrackDraw currently has generic editor primitives such as gate, flag, cone, ladder, dive gate, start pads, label, and race line. One useful next step is a catalog layer that knows about real track elements, official names, dimensions, 2D behavior, 3D presentation, and export/integration compatibility.

The catalog should start local and typed, not as a database. A database becomes useful later for club inventory, venue-specific kits, custom saved elements, and account-backed libraries.

## Top-Level Checklist

- [ ] Define a typed local element catalog for official and TrackDraw-provided elements.
- [ ] Move default placement for generic tools and presets onto catalog entries.
- [ ] Add official race-gate entries, including a MultiGP-style 5 ft x 5 ft standard gate, without changing existing saved designs.

## Reference Observations

TrackForge presents a useful comparison point for product shape, not something TrackDraw should clone wholesale. Its public app exposes a named track-element list with items such as Champs Gate (10x8), Standard Gate (7x6), Panel Flag, Feather Flag, Launch Block, Dive Gate (7x6), SGDC Dive Gate (3x3), Hurdle (10x5), and Waypoint. It also exposes grouping, saved elements, and an inventory surface.

TrackDraw already has stronger 2D editing, sharing, export handoff, account/gallery/API direction, and mobile-supported product boundaries. The opportunity is to make TrackDraw's element model feel more like real FPV planning while keeping the core editor predictable.

External references to retain while designing this:

- TrackForge public app: `https://trackforge.racing/`
- MultiGP Standard 5 ft x 5 ft gate reference: `https://shop.multigp.com/product/standard-multigp-gate-5x5/`
- MultiGP Global Qualifier diagram example with 5 ft x 5 ft gates: `https://www.multigp.com/wp-content/uploads/2022/03/2022-MultiGP-GQ-track-official-diagram-imperial.pdf`

## Phase 1: Local Element Catalog Foundation

Start state:

- Shape defaults are spread across generic editor tools and layout/starter preset helpers.
- A gate is generic and currently has no official product identity.
- 2D and 3D rendering mostly infer behavior from `ShapeKind` rather than a richer element definition.

Scope:

- Add a catalog module such as `src/lib/track/elements/catalog.ts`.
- Model catalog entries separately from saved shape instances.
- Keep saved shapes meter-based and backwards compatible.
- Add official metadata fields without making them required on existing shapes.

Candidate catalog entry fields:

- `id`: stable internal identifier, such as `multigp-standard-gate-5x5`
- `name`: user-facing name, such as `MultiGP Standard Gate 5x5`
- `organization`: optional source, such as `MultiGP`
- `kind`: existing TrackDraw shape kind
- `dimensions`: meter-based canonical dimensions plus display dimensions
- `defaultShape`: current TrackDraw shape draft defaults
- `tags`: `official`, `race`, `practice`, `timing-compatible`, `sim-export`
- `sources`: optional public URLs or documentation references
- `render2d`: optional icon/render hints
- `render3d`: optional model/render hints
- `exportHints`: optional simulator/export compatibility metadata

Done state:

- New generic gate placement can be powered by a catalog entry without changing existing project files.
- Tests verify catalog dimensions and shape defaults.
- Layout and starter presets can opt into catalog entries instead of duplicating dimensions.
- Existing imports/exports remain compatible.

## Phase 2: Official Element Entries

Start state:

- The catalog exists, but only replaces existing generic defaults.

Scope:

- Add the first official gate entries after validating exact sizing and source language:
  - MultiGP Standard Gate 5x5
  - MultiGP Champ Gate 7x6 or 10x8 only after confirming the correct naming/dimensions for the intended race context
  - Dive gate variants only after deciding whether they should remain one `divegate` shape or become catalog-driven variants
- Keep "Custom Gate" available so users are not boxed into official-only dimensions.
- Expose the official name in inspector/export summaries only when the shape was created from a catalog entry or explicitly assigned one.

Done state:

- Users can place at least one official named race gate.
- The inspector can show the official identity and dimensions without hiding editable width/height controls.
- Export and Race Pack copy can reference official names where helpful.

## Phase 3: Element Library UI

Start state:

- Catalog entries exist, but the toolbar may still look like generic shape tools.

Scope:

- Add a compact element picker behind existing tool groups instead of expanding the primary toolbar.
- Keep quick placement fast: one-click Gate still places the default gate.
- Add a secondary way to choose variants such as official gates, flags, launch blocks, hurdles, and custom saved elements.
- Avoid card-in-card layouts and keep mobile picker behavior deliberate.

Done state:

- Users can choose official or generic variants without slowing down the common workflow.
- Mobile users can still place common items without opening a dense desktop-style library.
- The current starter layouts continue to work.

## Boundaries

- Do not change stored shape dimensions globally just because an official catalog entry exists.
- Do not migrate existing projects to new official gate sizes automatically.
- Do not couple element catalog work to accounts in the first slice.
- Do not copy a competitor's UI wholesale; borrow validated product patterns and fit them into TrackDraw's existing editor model.
