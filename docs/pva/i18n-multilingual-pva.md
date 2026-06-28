# I18n Multilingual Experience PVA

Date: June 25, 2026

Status: draft, approved for phase 1 build

## Decision Summary

Recommended direction:

- use next-intl without URL routing — locale is a user preference, not a URL segment
- store locale in a Zustand persist store under `trackdraw.locale`, using browser language as the initial default
- use nested JSON message catalogs per namespace, one directory per locale under `messages/`
- integrate via a single `NextIntlClientProvider` in the root layout, with `src/i18n/request.ts` resolving locale/messages server-side from the locale cookie or request language
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
- message files live under `messages/` at the project root, one subdirectory per locale
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

- key: `trackdraw.locale`
- default: derived from `navigator.languages` matched against supported locales, falling back to `en`
- tab-sync via `storage` event
- no legacy migration shim needed (new key)

Supported locales are defined in `src/lib/i18n/locales.ts` as a typed constant so the store and the provider share the same source of truth.

### Provider Integration

`src/i18n/request.ts` resolves the locale and message bundle for next-intl on the server. `src/app/layout.tsx` reads `getLocale()` and `getMessages()` and wraps the app tree in `NextIntlClientProvider`.

The locale cookie (`trackdraw-locale`) is written by the Zustand store's `onRehydrateStorage` callback so server renders after the first visit stay in sync without an extra network round-trip.

### Message Catalog Structure

```
messages/
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
4. `messages/en/editor.json` covering Toolbar and StatusBar strings
5. Convert `Toolbar.tsx` and `StatusBar.tsx` to `useTranslations('editor')`
6. Language picker stub in account menu

Phase 2 — inspector + dialogs (~200 strings)

Phase 3 — landing page (~500+ strings)

Phase 4 — dashboard + remaining surfaces

### Language Picker Placement

A language selector appears in the same settings/account area as the measurement unit toggle. It is visible and functional without an account. The initial UI is minimal — a dropdown with language name in the target language (e.g., "Nederlands", "English").

## Out of Scope

- URL-based locale routing
- Machine translation or automated string extraction
- Locale-aware date/number formatting beyond what next-intl provides out of the box
- Locale-specific legal pages (privacy, terms) in phase 1
- Right-to-left layout support
