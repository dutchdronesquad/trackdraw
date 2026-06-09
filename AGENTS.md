# AGENTS.md

## Purpose

TrackDraw is a browser-based FPV race track designer built with Next.js, React, Zustand, Konva, and Three.js.

Agents should optimize for product safety and clear ownership. The editor is already feature-rich, and small regressions in selection, transforms, autosave, sharing, export, mobile flows, or read-only viewing are expensive.

Use `README.md` for the product overview and `CONTRIBUTING.md` for setup, commands, runtime modes, and validation expectations. Keep this file focused on durable repo conventions for future agents.

## Product Boundaries

- Main surfaces: `/`, `/studio`, `/gallery`, `/share/[token]`, and embed/read-only viewers.
- Core editing, autosave, import/export, and published sharing must remain usable without an account.
- Mobile is a supported product surface, not a desktop fallback.
- Shared links must stay compatible with the canonical `/share/[token]` route. Gallery cards must keep using that destination.
- Do not break import/export, autosave, share publish/read flows, or read-only viewing while changing editor features.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand with zundo and Immer
- Better Auth for account, passkey, magic-link, role, and API-key flows
- Konva for the 2D editor
- Three.js with react-three-fiber for 3D preview
- OpenNext on Cloudflare with D1 and R2-backed gallery preview media

## Working Agreement

- Prefer targeted changes over architectural churn, but keep naming and file placement deliberate.
- Preserve existing visual language and interaction patterns unless the task explicitly asks for redesign.
- Do not introduce `card in card` UI patterns.
- Keep TypeScript strictness intact. Avoid `any` unless there is a clear boundary reason.
- Reuse existing helpers and types before adding parallel abstractions.
- Treat `src/components/ui/*` as a design-system boundary. Do not modify shared UI primitives unless the task explicitly asks for a design-system change or there is no safer alternative.
- Be precise with filenames, imports, and symbols. Do not rename identifiers unless the change is intentional and usage has been checked.
- When fixing lint or type errors, match the exact reported file and symbol before editing.
- Do not revert unrelated dirty work. Work with existing changes unless the user explicitly asks for a revert.

## Ownership Map

- `src/app`: route entry points and page-level metadata
- `src/components/editor`: authenticated/anonymous editor shell, toolbar, dialogs, mobile panels
- `src/components/canvas/editor`: interactive 2D/3D editor canvas behavior
- `src/components/canvas/viewer`: read-only/share/embed canvas behavior
- `src/components/canvas/renderers/shape2d`: 2D Konva renderers per item family
- `src/components/canvas/preview3d`: 3D preview scene, theme, overlays, flythrough, and item renderers
- `src/components/inspector`: inspector composition, views, catalog controls, and item-specific sections
- `src/store`: editor state, undo/redo, persistence-oriented logic
- `src/lib/editor`: editor tool registry, placement catalog, store types, and editor view models
- `src/lib/track`: track schema, geometry, orientation, timing, item registry, and catalog metadata
- `src/lib/export`: SVG, Velocidrone, and flythrough export implementations
- `src/lib/server`: server-side auth/session/project helpers
- `tests`: unit, regression, and component coverage grouped by product area
- `tests/helpers`: shared test fixtures and mocks
- `docs`: roadmap, deployment, planning, and research material

## Naming Conventions

- Prefer filenames that describe responsibility over viewpoint-only names.
- Inspector views use explicit names such as `single-shape.tsx`, `multi-selection.tsx`, `project-layout.tsx`, and `list-panel.tsx`.
- 2D renderers live under `src/components/canvas/renderers/shape2d/` and should be split by item or tight item family.
- 3D item renderers live under `src/components/canvas/preview3d/items/`.
- Export implementations should be split by format and item, e.g. `src/lib/export/svg/gate.ts` and `src/lib/export/flythrough/gate.ts`.
- Avoid compatibility barrel files after a migration. Temporary barrels are acceptable only during a narrow rename, and should be removed before finishing the task.

## Track Item Architecture

Shared item behavior belongs in `src/lib/track/items/registry.ts`. When adding or changing item kinds, extend the registry before adding parallel switch logic elsewhere. The registry owns labels, tools, shortcuts, default catalog placement, orientation offsets, numbering, setup estimates, touch targets, route tolerance, and 3D handles.

Domain-specific behavior should stay near its owner:

- Editor tool creation: `src/lib/editor/tool-registry.ts`
- Catalog type switching: `src/lib/editor/catalog-type-patch.ts`
- Placement catalog view models: `src/lib/editor/placement-catalog.ts`
- 2D metrics: `src/lib/track/shape2d.ts`
- 2D rendering: `src/components/canvas/renderers/shape2d/`
- 3D item rendering: `src/components/canvas/preview3d/items/`
- SVG export: `src/lib/export/svg/`
- Flythrough export: `src/lib/export/flythrough/`
- Inspector item fields: `src/components/inspector/sections/`

## Adding A Track Item

When adding a new track item, touch these areas in order and let TypeScript expose missing dispatch entries.

1. `src/lib/types.ts`: add the `ShapeKind`, shape interface, `Shape` union member, and inventory membership if needed.
2. `src/lib/track/items/registry.ts`: add the item adapter.
3. `src/lib/track/elements/catalog.ts`: add catalog entries if the item is catalog-backed.
4. `src/lib/track/shape2d.ts`: add the 2D metric helper.
5. `src/components/canvas/renderers/shape2d/`: add the renderer and register it in `index.tsx`.
6. `src/components/canvas/renderers/shape-bounds.ts`: add bounds support.
7. `src/components/canvas/preview3d/items/`: add the 3D component and register it in `TrackItem3D.tsx`.
8. `src/lib/export/svg/`: add SVG serialization and register it in `exportSvg.ts`.
9. `src/lib/export/flythrough/`: add flythrough scene support and register it in `flythroughSceneShapes.ts`.
10. `src/components/inspector/sections/`: add item-specific fields and render them from `single-shape.tsx` when needed.
11. Export-specific formats such as Velocidrone should be updated only when the item is supported by that format.

Add focused tests next to the changed ownership area. At minimum, cover registry completeness and one geometry/render/export behavior when the item has custom behavior.

## Design Schema

`TrackDesign.version` is currently `2`. `normalizeDesign` auto-migrates version 1 designs by shifting gate and ladder rotations by `-180°` so the visual result is unchanged. Always create new designs with `version: 2`.

Gate, ladder, and tower-style shapes use `rotation: 0` as the stored forward-facing direction. 2D and 3D renderers apply their internal visual offsets through the established renderer/registry conventions. Do not add ad hoc rotation offsets in unrelated code.

## Validation

Use these commands after non-trivial code changes when the environment allows it:

- `npm run lint`
- `npm run test`
- `npm run type`
- `npm run build`

Use `npm run preview` when validating D1-backed, auth-backed, share ownership, gallery publishing, REST API, Cloudflare runtime behavior, or deployed-runtime assumptions.

If Node/npm are unavailable in the execution environment, state that clearly in the final response and still run lightweight checks such as `rg` and `git diff --check`.

## Documentation And Legal

Update `README.md`, `CONTRIBUTING.md`, or files in `docs/` when behavior, routes, scripts, or roadmap status materially changes.

- Keep `README.md` product-facing and lightweight.
- Keep contributor setup, commands, runtime notes, and validation guidance in `CONTRIBUTING.md`.
- Keep longer planning, deployment, and research material in `docs/`.
- Check `docs/deployment/deployment-setup.md` when adding or changing routes, deployed runtime behavior, Cloudflare bindings, Worker guards, scheduled jobs, public media handling, or WAF/rate-limit assumptions.
- Do not include machine-specific absolute paths in committed docs.
- Do not update completed roadmap archive sections unless making a factual correction.
- Keep `AGENTS.md` focused on durable conventions, not one-off task notes.

When product surfaces, account features, sharing mechanisms, or data flows materially change, check `src/app/privacy/page.tsx` and `src/app/terms/page.tsx`. Update their `effectiveDate` when material legal text changes.

## Pull Requests

- Use Conventional Commit-style PR titles, such as `feat: Improve map reference controls`.
- Keep PR bodies compact and product-facing.
- Use `SSIA` only for very small PRs where the title fully explains the change.
- Apply `enhancement` for product/code improvements and `dependencies` for dependency-only PRs.

## Changelog

When updating `CHANGELOG.md`, write for users first:

- Document shipped or release-bound user-facing changes.
- Keep entries compact and product-facing.
- Group small related changes into one stronger theme.
- Avoid dependency bumps, refactors, or internal cleanup unless they have a clear user-visible effect.
