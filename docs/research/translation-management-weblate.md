# Translation management: self-hosted Weblate

Context: ~7400 lines of translation strings across `en`/`nl`/`de` in `lang/*/*.json`, with another language such as Chinese expected through contributor work. Lokalise was considered but is pricey for this scale; Tolgee's self-hosted tier turned out to be license-gated with a 500-string cap. Weblate is the strongest free/open self-hosted alternative: AGPL, no string limits, well-established, and suitable for contributor-driven translation review.

This is moving from "nice later tooling" to a real maintenance concern. Three shipped languages are already enough to make manual JSON editing noisy, and every additional language multiplies review volume, stale-key risk, terminology drift, and contributor onboarding friction.

## Why Weblate

- Fully open source, no artificial caps, self-hostable via Docker.
- Native support for JSON translation files (nested JSON / i18next JSON), matching the existing `lang/{locale}/{namespace}.json` structure without reformatting.
- Per-namespace "components" map cleanly onto the current translated files: `common`, `dialogs`, `editor`, `exportPdf`, `inspector`, `landing`, `login`, `setupEstimate`, `shapes`, and `share`.
- `dashboard` and `legal` stay English-only and should not be opened for translation in Weblate unless that product/legal boundary is deliberately changed later.

## Proposed setup

- **Hosting**: on the existing app VPS, as a separate Docker Compose stack (Weblate + Postgres + Redis), behind the existing reverse proxy with its own TLS subdomain.
- **Sync with the repo**: CI-driven rather than Weblate's built-in git integration — a GitHub Actions workflow that:
  - **push-source**: on push to `main` touching translatable `lang/en/**` namespaces, uploads the updated English source file per namespace to Weblate via its REST API.
  - **pull-translations**: on a schedule (e.g. daily) or manual trigger, downloads the current `nl`/`de` translations for translatable namespaces and opens a PR if anything changed, so updates still go through normal review before merging.
- **One-time setup in Weblate UI**: create the `trackdraw` project (source language `en`), one component per translatable namespace, add `nl`/`de` as translation languages, generate an API token for the CI workflow.

## Contributor access model

Recommended TrackDraw model:

- Start with a private/staging Weblate instance while the workflow is being proven.
- For production, prefer a Protected Weblate project: visible enough for contributors to find, but only chosen users can contribute.
- Do not allow direct pushes from contributors to GitHub or `main`.
- Do not give normal translators Weblate API tokens, GitHub tokens, repository access, source-string edit permissions, or project administration rights.
- Assign a language leader for every supported non-English language. This person owns terminology consistency, reviews contributor suggestions, and decides when a translation is ready to ship.
- Add contributors to language-scoped teams, for example a Chinese translator team limited to `zh` and translatable components only.
- Start new contributors with suggestion-only access where possible. They can propose translations without directly changing the accepted translation state.
- Promote contributors to limited Translate access only after trust is established and the language leader has review capacity.
- Give Review permissions only to maintainers or language leaders who can approve strings for their language.
- Let source string problems be reported through Weblate comments/source feedback rather than giving translators source-edit rights.
- Keep `dashboard` and `legal` components unavailable to contributor teams.

Practical contribution flow:

1. Contributor asks to help with a language.
2. Maintainer confirms there is a language leader for that language and sends a Weblate invite.
3. Contributor suggests strings in Weblate.
4. Language leader handles terminology, failing checks, contributor feedback, and approvals.
5. CI pulls Weblate changes into a normal translation PR.
6. The PR runs locale validation, unresolved-key checks, hardcoded-copy checks, and any relevant UI/export tests before merge.

If a contributor leaves, remove them from their Weblate teams or disable the account. Rotate tokens only when the contributor had access to a shared/service token or when a service account is removed or suspected compromised. In the recommended setup, ordinary translators should not have tokens to rotate.

## Production deployment requirements

A production Weblate instance should be treated as maintained project infrastructure, not a throwaway side service.

Deployment shape:

- Run Weblate, Postgres, Redis, and backups as a separate Docker Compose stack from the TrackDraw app.
- Put Weblate behind the existing reverse proxy with its own TLS subdomain.
- Keep Weblate data volumes outside disposable container paths and document the exact volume locations.
- Pin image versions and plan deliberate upgrades instead of tracking `latest`.
- Keep environment variables, admin credentials, API tokens, SMTP credentials, and database passwords in the existing secret-management path.

Operations:

- Configure outbound email before inviting contributors, because account confirmation, password reset, and notification flows depend on it.
- Decide whether Weblate accounts are local-only or connected to an existing identity provider.
- Restrict admin rights to maintainers; translators should only get project/language permissions they need.
- Configure spam protection and registration moderation if public signup is enabled.
- Add basic uptime monitoring and error/log review.
- Define a maintenance window and rollback plan for Weblate upgrades.

Backups and recovery:

- Back up Postgres and Weblate media/data volumes on a schedule.
- Store backups off-host where possible.
- Test restore into a fresh instance before relying on the service.
- Include API tokens and project/component configuration in the recovery checklist.
- Document what happens if Weblate is down: normal app deployment must continue, and translation PR generation can pause without blocking TrackDraw releases.

Security boundaries:

- Do not let Weblate push directly to `main`.
- Prefer PR-based translation sync so CI and review remain the release gate.
- Use a dedicated GitHub/API token with the narrowest permissions possible.
- Rotate service tokens if a service account is removed, if a token is suspected compromised, or if any contributor had access to that token.
- Keep `dashboard` and `legal` namespaces out of Weblate components unless that boundary is deliberately changed later.

## Product and repo requirements

- Keep English as the source language and stable fallback.
- Keep the current `lang/{locale}/{namespace}.json` layout unless a proven import/export limitation forces a narrower change.
- Keep route structure unchanged; translation management must not introduce locale-prefixed URLs.
- Keep `dashboard` and `legal` English-only. They can remain in the repo for fallback/source use, but they should stay out of contributor translation workflows.
- Keep all translation changes reviewable as normal pull requests.
- Preserve CI checks for locale parity, unresolved keys, and intentional hardcoded-copy exceptions.
- Support external contributors without requiring direct repository write access.
- Add new languages only when there is an owner for terminology review, compact UI labels, and export/PDF/Race Pack copy.
- Prevent translation growth from making the Cloudflare Worker package grow linearly with every added language.

## Worker bundle-size impact

Weblate will not make the Cloudflare Worker zip smaller by itself. Weblate is a translation management and review workflow; the same JSON files still end up in the repository unless the build/runtime loading strategy changes.

TrackDraw now copies locale namespaces to generated static assets under `public/locales/{locale}/{namespace}.json`. The generated files are ignored by git and are refreshed by `npm run i18n:sync-assets` inside the production build script. Preview and deploy go through the OpenNext build step, so they get the same generated assets through `npm run build`. Local dev and tests can read directly from `lang/{locale}` and do not need generated assets.

At runtime, `src/i18n/catalogs.ts` loads locale namespaces from the Cloudflare `ASSETS` binding in OpenNext, with a local filesystem fallback for `next dev` and tests. English remains the source and fallback locale, but it is no longer statically imported as a full catalog. That means adding Chinese or another contributor-maintained language should increase static asset output, but should not automatically bundle another full locale catalog into the Worker script itself.

Keep these constraints:

- keep English as the stable fallback and source language
- generate `dashboard` and `legal` only for English
- keep route-level namespace picking so pages do not send unused messages to the client
- measure `.open-next`/Worker output before and after adding a large language
- only consider R2 for translation catalogs if static assets still create unacceptable Worker/package pressure or operational limits

## Recommended implementation slice

1. Measure the OpenNext output after the static-asset locale loading change and again after adding a large language.
2. Stand up a private/staging Weblate instance using Docker Compose and import `en`, `nl`, and `de`.
3. Test one translatable namespace end to end, preferably `common` or `inspector`, including upload from `lang/en/**`, translation edits in Weblate, download, PR creation, and the existing locale validation checks.
4. Add Chinese as a trial contributor workflow only after the import/export loop and Worker-size strategy are proven.
5. Document translator guidance: FPV terms that stay English, compact label expectations, placeholders/ICU syntax, and the `dashboard`/`legal` English-only boundary.
6. Decide whether CI-driven sync is enough or whether Weblate's built-in git integration is worth the extra operational coupling.

## Risks and decisions

- Weblate adds infrastructure ownership: updates, backups, spam protection, user access, email delivery, and storage.
- CI-driven sync keeps repository review clean, but it means Weblate state and git state can drift if jobs fail.
- Built-in Weblate git sync may reduce custom workflow code, but could create noisier translation commits or require more trust in the translation service.
- Nested JSON and ICU-style placeholders need explicit checks so translators do not accidentally break runtime formatting.
- Dashboard and legal namespaces stay source-language only. Legal translation would need a separate legal review standard before this boundary changes.
- Adding languages still increases generated static assets, so OpenNext output should be measured before every large new locale.

## Alternatives considered

- **Inlang**: fully git-based, no server to run, but the user found the docs hard to follow — parked for now.
- **Crowdin / POEditor**: hosted, free tiers for small/open-source projects, no infra to maintain, but less control than self-hosting and free-tier limits could bite later.
- **Custom script**: a missing/stale-key diff checker in CI — zero infra, but no UI for non-technical translators.

## Status

Recommended near-term follow-up. No infra or workflow files have been created yet. Next step if we proceed: prototype the Weblate Docker Compose stack and a one-namespace GitHub Actions sync loop before migrating all translation work.
