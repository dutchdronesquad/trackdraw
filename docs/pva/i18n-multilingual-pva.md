# I18n Multilingual Experience PVA

Date: June 25, 2026

Status: done — phases 1-9 shipped (2026-06-28)

## Decision Summary

Recommended direction:

- use next-intl without URL routing — locale is a user preference, not a URL segment
- store locale in a Zustand persist store under `trackdraw.locale`, using browser language as the initial default
- use nested JSON message catalogs per namespace, one directory per locale under `lang/`
- integrate via a single `NextIntlClientProvider` in the root layout, with `src/i18n/request.ts` resolving locale/messages server-side from the locale cookie or request language to prevent hydration flash
- roll out namespace by namespace rather than converting all surfaces at once
- expose a language picker in the account menu / settings surface, accessible without an account

The desired result is a product that detects the user's browser language on first visit, can be manually overridden, and persists that preference independently from measurement units. URL structure, share links, and gallery routes remain unchanged.

## Rationale

URL-based locale routing (`/nl/studio`, `/en/gallery`) offers better SEO on the landing page but requires a large routing refactor — every `app/` path gets a `[locale]` dynamic segment and middleware. The product direction says solo workflow speed comes before marketing optimization. The share link compatibility requirement and the editor-focused usage pattern make a preference-based approach a significantly safer first step.

next-intl has an explicit "without routing" mode designed for this. The Zustand persist pattern is already established in this codebase for measurement units and editor hints, so locale storage follows an existing convention rather than introducing a new one.

## Approval Recommendation

Approve phase 1 (architecture + editor namespace pilot) if TrackDraw accepts:

- locale does not change URLs, share links, or embed routes
- the `NextIntlClientProvider` wraps the full app tree at the root layout level
- message files live under `lang/` at the project root, one subdirectory per locale
- the locale store uses `navigator.languages` as default and falls back to `en` if no match is found
- the editor namespace ships first as the pilot before other surfaces are migrated
- untranslated strings fall back to the English message, never to a missing-key error

Do not approve automatic machine translation, locale-based URL redirection, or changes to the share/embed routing contract before the editor pilot is stable.

## Go / No-Go Criteria

Go for phase 1 implementation if:

- adding the `NextIntlClientProvider` does not affect editor load time or hydration behavior
- switching locale updates all translated strings without a full page reload
- the locale store tab-syncs correctly, matching the behavior of the measurement unit store
- the editor namespace can be translated without touching the catalog metadata or shape schema
- untranslated namespaces continue to render English strings without errors
- locale bootstrapping stays server-side through `src/i18n/request.ts` and does not duplicate the ThemeBootstrap client pattern

No-go or delay if:

- next-intl without routing introduces incompatibilities with the OpenNext Cloudflare runtime
- the `NextIntlClientProvider` requires passing all locale messages through a Server Component boundary in a way that breaks static rendering for the landing page
- locale switching causes editor state loss, undo stack corruption, or autosave conflicts

## Architecture

### Library

next-intl (without i18n routing mode). Chosen over react-i18next for native App Router and Server Component support, and over lingui to avoid a compile step.

### Locale Store

`src/store/locale.ts` — Zustand persist store, same structure as `measurement-unit.ts`:

- localStorage key: `trackdraw.locale`
- cookie: `trackdraw-locale`
- default: derived from `navigator.languages` matched against supported locales, falling back to `en`
- tab-sync via `storage` event
- no legacy migration shim needed (new key)

Supported locales are defined in `src/lib/i18n/locales.ts` as a typed constant so the store and the provider share the same source of truth.

### Provider Integration

`src/i18n/request.ts` resolves the locale and message bundle for next-intl on the server. `src/app/layout.tsx` reads `getLocale()` and `getMessages()` and wraps the app tree in `NextIntlClientProvider`.

The locale cookie (`trackdraw-locale`) is written by the Zustand store's `onRehydrateStorage` callback so server renders after the first visit stay in sync without an extra network round-trip. The localStorage key remains `trackdraw.locale`.

### Message Catalog Structure

```
lang/
  en/
    common.json       ← shared labels: buttons, statuses, errors
    editor.json       ← toolbar, tools, status bar, context menus
    inspector.json    ← inspector panels and property fields
    dialogs.json      ← share, account, project, import/export dialogs
    landing.json      ← marketing page copy
    dashboard.json    ← admin dashboard and operator tooling
  nl/
    common.json
    editor.json
    ... (add as translated)
```

Namespaces map directly to `useTranslations('editor')`, `useTranslations('inspector')`, etc.

### Rollout Order

Phase 1 — architecture + editor pilot:

1. Install next-intl, add `src/lib/i18n/locales.ts`
2. `src/store/locale.ts` Zustand persist store
3. `src/i18n/request.ts` server locale/message resolver + `NextIntlClientProvider` in root layout
4. `lang/en/editor.json` covering Toolbar and StatusBar strings
5. Convert `Toolbar.tsx` and `StatusBar.tsx` to `useTranslations('editor')`
6. Language picker stub in account menu

Phase 2 — inspector + dialogs (~200 strings)

Phase 3 — landing, login, legal pages (~500+ strings)

Phase 4 — admin dashboard (`src/app/dashboard/**`, `src/components/dashboard/**`): users, audit, metrics, API keys, gallery management, sidebar (~190 strings)

Phase 5 — editor surfaces left over from the phase 1 pilot: Header, MobileAppMenu, mobile panels, viewer header, starter overlay, layout preset picker, save-as-preset dialog, view mode switch, desktop inspector panel, and related smaller components. Explicitly excludes `tool-icons.tsx` group titles and `PerformanceHud` (dev-only HUD) — see phase 8.

Phase 6 — public share/embed viewers (`src/app/share/**`, `src/app/embed/**`): read-only review links and embed error/unavailable states

Phase 7 — inspector leftovers (ElevationChart, MapReferenceDialog) and the public gallery grid

Phase 8 — shared tool/shape vocabulary centralization. `toolLabels`/`shapeKindLabels` were static English exports used outside the React tree by many components. Replaced with a `shapes` namespace plus resolver functions that take an explicit `t` argument, including the setup-guide content (`setup-estimate.ts` → `setupEstimate` namespace) and the Race Pack/standard PDF generator (`exportPdf.ts` → `exportPdf` namespace).

Phase 9 — the "phase 2 gap": visible button text and dynamic status/summary strings that phase 2 missed (it only covered `aria-label`/`title`). Covered the multi/single-shape inspector views, the project-layout panel (incl. a new `routeNumbering` namespace), and the canvas right-click menu, which had no translation calls at all.

### Post-launch cleanup

A few issues surfaced once translated copy was live in both locales and the test suite was fully exercised:

- **Layout**: tight 3-column action-button rows (lock/duplicate/delete, group/ungroup, continue editing/connect ends) clipped the icon when the Dutch label was longer than English. Fixed with `min-w-0`/`shrink-0`/`truncate` plus shorter NL button labels (`Vergrendel`, `Ontgrendel`, `Groepeer`, `Opheffen`, `Doorgaan`, `Verbinden`, etc.) distinct from the fuller tooltip text.
- **Missed strings found after the fact**: the "Front" rotation-handle label on the 2D canvas (`shapes.canvas.frontLabel`) and the catalog "Official size" row label (renamed to `catalog.sizeLabel`, value "Size"/"Afmeting") had no translation call at all.
- **Test infrastructure**: added a global `NextIntlClientProvider` (client) and `getTranslations`/`getLocale`/`getMessages` (server) mock in `tests/setup.ts`, wired via `vitest.config.ts`'s `setupFiles`. This replaced the per-file `NextIntlClientProvider` gap that had been causing ~28 test files to fail since phase 1, without needing to touch each test file individually.
- **Content bugs surfaced by fixing the test gap**: missing `dialogs.account.danger.description`/`typeToConfirm` keys, missing `dialogs.export.formats.velocidrone.descriptionFull`/`descriptionShort`, an entirely unwired `dialogs.newProject.*` namespace (only `title`/`closeAriaLabel` existed by coincidence), a copy-paste `t("shapes.tower")` instead of `t("tower.sectionTitle")` in `TowerSection.tsx`, and a NL `deletePlaceholder` of "VERWIJDEREN" that didn't match the hardcoded `"DELETE"` confirmation check (blocked Dutch users from deleting their account).
- **Tooling**: added `scripts/i18n_check.mjs` (`npm run i18n:check`) — diffs every locale's message files against the `en` baseline for missing/extra keys, and statically scans `src/**` for `useTranslations`/`getTranslations` call sites to flag any key that doesn't resolve in the `en` catalog. Added `scripts/i18n_hardcoded_scan.mjs` (`npm run i18n:scan-hardcoded`) as a separate TypeScript/TSX parser-based hardcoded-copy guard with `scripts/i18n_hardcoded_allowlist.json` as the current debt baseline. CI now runs both checks from `.github/workflows/linting.yaml`.

## Post-Implementation Review

Date: June 28, 2026

Status: resolved — implementation follow-up completed and merged into this PVA.

Scope: audit of the EN/NL multilingual rollout against this PVA, the `lang/en` and `lang/nl` catalogs, and visible UI call sites in `src/app`, `src/components`, and the main editor/viewer surfaces.

### Review Summary

The core catalog structure is in good shape: `npm run i18n:check` reports 0 locale-parity issues and 0 statically unresolved translation keys. English and Dutch have the same namespace files and the same key shape.

The follow-up implementation translated the user-facing strings found in the review, fixed concrete Dutch copy issues, localized public share metadata, aligned the PVA with the implemented `lang/` catalog and `trackdraw-locale` cookie names, and added a `common` namespace for generic labels, actions, and status values.

### Review Validation

- `npm run i18n:check` passes.
- `npm run i18n:scan-hardcoded` passes with the current baseline.
- Checked key counts and identical key shape across all `lang/en/*.json` and `lang/nl/*.json`.
- Searched TS/TSX for direct visible text in translated surfaces.
- Reviewed selected NL strings for terminology, spelling, grammar, and placeholder consistency.

### PR Scope Audit

The PR is intentionally scoped as the full EN/NL multilingual rollout, not only the final follow-up commit. The branch contains:

- phase 1 architecture: next-intl setup, locale store, root provider, and language picker;
- phase 2-9 surface migrations across editor, inspector, dialogs, landing/login/legal, dashboard, share/embed, gallery, export/PDF, setup guidance, and shared shape/tool vocabulary;
- test infrastructure updates for translated React and server call sites;
- follow-up review fixes for missed strings, Dutch copy, `common` extraction, and `Path`/`waypoint` terminology;
- tooling and CI additions for catalog validation and hardcoded-copy scanning;
- PVA updates documenting the rollout, review findings, and remaining debt.

The `next.config.ts` change in this PR is part of i18n scope because it wires the next-intl plugin. Local development-origin changes are out of scope for this PR and should stay separate.

### Review Findings And Resolutions

#### P1 - Direct English remained in user-facing translated surfaces

`src/components/dialogs/ShareDialog.tsx` still contained a large hardcoded English gallery-management block, including `Moderation lock`, `Gallery details`, `List in gallery`, `Title`, `Description`, `Generating preview...`, `Save changes`, `Add to gallery`, `View gallery`, and `Remove from gallery`.

Resolution: fixed in `dialogs.share.gallery`, `dialogs.share.link`, `dialogs.share.embed`, and `dialogs.share.actions`. Generic labels/actions moved to `common` where appropriate.

#### P1 - Account security and API key views were only partially translated

`src/components/dialogs/AccountDialog/ApiKeysView.tsx` and `src/components/dialogs/AccountDialog/SecurityView.tsx` already called `useTranslations("dialogs")`, but adjacent labels were still hardcoded, including API key labels, expiry options, copy/cancel actions, passkey states, email labels, and empty/loading states.

Resolution: fixed in `dialogs.account.security` and `dialogs.account.apiKeys`, with generic actions and labels moved to `common`.

#### P1 - Account deletion confirmation copy was inconsistent

In `lang/nl/dialogs.json`, the visible danger-zone prompt and placeholder correctly used `DELETE`, but the validation error told Dutch users to type `VERWIJDEREN`. The actual code checks `deleteConfirmation.trim().toUpperCase() !== "DELETE"` in `AccountDialog/DangerView.tsx`.

Resolution: fixed in `lang/nl/dialogs.json`.

#### P2 - Canvas/editor controls still had hardcoded English

Both editing and read-only canvas surfaces contained direct English strings such as `Path editing`, `Add points`, `finish`, `cancel`, `Click to connect ends`, `Grid`, `Snap on: grid, objects, routes`, `Snap off: free placement`, `Mid-click`, `Right-click`, `pan`, `menu`, `bypass`, and `Fit to window`.

Resolution: fixed in `editor.canvasOverlay`.

#### P2 - Desktop modal wrappers were inconsistent with mobile translations

Some mobile paths used translated titles/subtitles while the desktop path remained hardcoded:

- `src/components/dialogs/ProjectVersionConflictDialog.tsx`
- `src/components/dialogs/ImportDialog.tsx`
- `src/components/dialogs/ProjectManager/RestoreTab.tsx`

Resolution: fixed in `dialogs.import`, `dialogs.versionConflict`, and `dialogs.projectManager.restore`.

#### P2 - Polyline and elevation tooling had untranslated labels

`src/components/inspector/views/polyline/PolylineWaypointList.tsx` and `src/components/inspector/ElevationPanel.tsx` contained untranslated labels for waypoints and elevation chart controls.

Resolution: fixed in `inspector.polyline` and `inspector.elevationChart`.

#### P2 - 3D preview overlay had untranslated controls

`src/components/canvas/preview3d/overlays.tsx` had direct English labels for play/pause, speed, and FPV camera behavior.

Resolution: fixed in `editor.preview3dOverlay`. `FPV` remains English by design.

#### P2 - Metadata and API docs were not localized

Public share metadata was part of the product surface and still English-only. API docs also had hardcoded document language/title behavior.

Resolution: public share metadata is localized via `share.metadata`. API docs now set `lang` and title from the locale cookie.

### Dutch Copy Notes

The FPV scene naturally uses a lot of English vocabulary. Terms such as `gate`, `dive gate`, `race line`, `path`, `track walk`, `crew`, `FPV`, `flythrough`, `preview`, `passkey`, `API`, and `embed` can be intentional and should not be translated mechanically if they match how pilots and organizers actually talk.

The issue is not English terminology by itself. The issue is inconsistent product terminology without an obvious rule:

- `share`, `shares`, `deellink`, `gedeeld item`
- `track`, `baan`, `parcours`, `lay-out`
- `preset`, `layout-preset`, `sectie`
- `preview`, `review`, `flythrough`, `embed`
- `account-published`, `accountgepubliceerde`, `account-gepubliceerde`

Recommended direction: create a small glossary with two columns: domain terms that deliberately stay English, and product/action terms that should be standardized. For example, keep `gate`, `race line`, `track`, `preview`, and `flythrough` if those are the expected FPV words, but decide consistently whether UI actions say `deellink` or `share link`, and whether admin records are called `shares` or `gedeelde tracks`.

#### Working Glossary

| Concept                                                           | Dutch UI direction                                                                                                                                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `track`                                                           | Keep as `track` for FPV/product context. Avoid switching between `baan`, `parcours`, and `track` unless the copy is deliberately explanatory.               |
| `gate`, `dive gate`, `tower`, `ladder`, `flag`, `cone`, `barrier` | Keep the FPV/catalog item names as-is where they are established in the scene.                                                                              |
| `race line`                                                       | Keep as `Race Line` for the route item kind and inspector section.                                                                                          |
| `path` / `Path`                                                   | Keep `Path` for the editor tool, sidebar/tool labels, path-builder UI, and shortcuts. Use Dutch descriptive wording only in prose where it reads naturally. |
| `waypoint`                                                        | Keep `waypoint` for route/path points and editing controls.                                                                                                 |
| `preview`, `3D preview`, `flythrough`, `embed`, `API`, `passkey`  | Keep English when used as product/domain terms.                                                                                                             |
| `share link`                                                      | Prefer `deellink` for user-facing link actions, unless the admin data model is explicitly about raw `shares`.                                               |
| Generic actions/statuses                                          | Use Dutch through `common` where possible: `Opslaan`, `Verwijderen`, `Actief`, `Gepubliceerd`, etc.                                                         |
| `backup`                                                          | Use `back-up` in visible Dutch copy.                                                                                                                        |

Concrete copy fixes applied:

- Fixed restored gallery event labels to `Item hersteld` / `Galerij-item hersteld`.
- Fixed `galeriijpublicatie` to `galerijpublicatie`.
- Fixed `Één klik` to `Eén klik`.
- Rephrased `een enkel paal` to `één enkele paal`.
- Rephrased `overschrijden dit` to `overschrijden de limiet`.
- Standardized visible `backup` copy to `back-up`.
- Rephrased `Herpositioneer nabije waypoints` to `Verplaats nabijgelegen waypoints`.
- Standardized Dutch route-editing copy around `waypoint` where the FPV/editor context expects that term.

### Tooling Follow-Up

`scripts/i18n_check.mjs` is useful and stays in CI, but it cannot catch every class of issue by itself:

- hardcoded JSX text, attributes, modal props, and placeholders;
- server metadata strings;
- dynamic translation usage outside the simple `const t = useTranslations("namespace")` pattern;
- semantic mistakes where both locales have a key but the NL copy is wrong.

Resolution: added `scripts/i18n_hardcoded_scan.mjs` (`npm run i18n:scan-hardcoded`) as a separate, conservative TypeScript/TSX parser-based scan for hardcoded JSX text, common user-facing props, and metadata fields. It uses `scripts/i18n_hardcoded_allowlist.json` as the current debt baseline, so new hardcoded UI copy fails while existing known debt can be translated down over time.

The hardcoded allowlist is categorized by `group`, `priority`, and `note` so long-lived exceptions can be separated from product UI that should be translated soon. Current categories include:

- `product-ui-translate`
- `metadata-translate`
- `intentional-brand-alt`
- `keyboard-or-unit`
- `technical-token`
- `dev-or-technical-ui`
- `design-system-exception`

CI status: `.github/workflows/linting.yaml` runs both `npm run i18n:check` and `npm run i18n:scan-hardcoded`.

Baseline follow-up order:

1. Reduce `high:product-ui-translate` first, especially dialog, project manager, export, and data-table copy.
2. Reduce `high:metadata-translate` after product UI, because it affects public/social surfaces but is less interactive.
3. Review `medium:product-ui-translate` opportunistically when touching the owning surface.
4. Leave `exception:*` entries unless the UI context changes or a screen-reader/user-facing label clearly needs localization.
5. Keep baseline updates separate from feature work: when an entry is translated, remove or regenerate only the matching baseline entries.

Remaining gap: semantic NL copy mistakes still require review or a future glossary/lint pass.

### Completed Follow-Up

1. Fixed the `DELETE` validation copy mismatch.
2. Finished translation coverage in `ShareDialog`, `AccountDialog/ApiKeysView`, and `AccountDialog/SecurityView`.
3. Translated canvas chrome, polyline/elevation controls, and 3D overlay controls.
4. Applied the concrete NL typo/grammar fixes.
5. Added localized share metadata and locale-aware API docs title/lang.
6. Updated this PVA to match the implemented `lang/` structure and cookie/storage naming.
7. Added `common` for reusable actions, labels, and states, and moved low-risk repeated usages there.
8. Added categorized hardcoded-copy tooling and CI coverage.

### Language Picker Placement

A language selector appears in the same settings/account area as the measurement unit toggle. It is visible and functional without an account. The initial UI is minimal — a dropdown with language name in the target language (e.g., "Nederlands", "English").

## Out of Scope

- URL-based locale routing
- Machine translation or automated string extraction
- Locale-aware date/number formatting beyond what next-intl provides out of the box
- Locale-specific legal pages (privacy, terms) in phase 1
- Right-to-left layout support
