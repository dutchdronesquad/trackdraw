# Translation management: Crowdin versus Weblate

TrackDraw ships English, Dutch, German, and Simplified Chinese. Editing nested JSON by hand no longer scales well: every language increases stale-key risk, terminology drift, review work, and the onboarding burden for non-technical translators.

This document records the current comparison, but deliberately does not make an irreversible platform choice. The recommended next step is a hosted Crowdin pilot while retaining self-hosted Weblate as the fallback if hosted limits, licensing, or workflow control become a problem.

## Current repository scope

The source remains `lang/en-US/{namespace}.json`. The ten translatable namespaces are `common`, `dialogs`, `editor`, `exportPdf`, `inspector`, `landing`, `login`, `setupEstimate`, `shapes`, and `share`. Target catalogs and generated locale assets use Crowdin-compatible regional directories: `nl-NL`, `de-DE`, and `zh-CN`. Frontend product locale identifiers remain `en`, `nl`, `de`, and `zh-CN`. `dashboard` and `legal` remain English-only.

Measured on 2026-08-09, those ten namespaces contain:

- 1,627 source strings;
- approximately 8,577 English source words;
- approximately 25,731 hosted words in Crowdin for three target languages (`nl`, `de`, and `zh-CN`), because Crowdin calculates hosted words as source words multiplied by target languages.

Excluding `dashboard` and `legal` saves approximately 3,177 source words, or 9,531 hosted words with three targets. Counts are planning estimates; Crowdin's import and dashboard remain authoritative.

## Crowdin Free feasibility

Crowdin is the preferred pilot because it provides a mature contributor UI without adding servers, databases, backups, email delivery, monitoring, or upgrades to TrackDraw's operational workload.

Recent Crowdin support guidance states that the ordinary Free plan includes 60,000 hosted words. At TrackDraw's current source size this gives the following planning envelope:

| Target languages | Estimated hosted words | Fits within 60,000 |
| ---------------: | ---------------------: | :----------------: |
|                3 |                 25,731 |        Yes         |
|                4 |                 34,308 |        Yes         |
|                5 |                 42,885 |        Yes         |
|                6 |                 51,462 |        Yes         |
|                7 |                 60,039 |   No, just over    |

The public pricing page is dynamically rendered and does not always expose the numeric Free quota in its static content. Confirm the actual allowance in the Crowdin workspace before importing production translations. Add an internal warning around 45,000–50,000 hosted words so source growth does not turn the quota into an emergency.

Crowdin also offers qualifying open-source projects a granted license with unlimited projects, strings, and members. Eligibility requires, among other things, a public OSI-licensed codebase, an established active project, no related commercial products, and participation in Crowdin's Global Translation Memory. TrackDraw may qualify today, but future paid products or services could change that assessment. Apply transparently and do not make the workflow dependent on receiving or permanently retaining this license.

References:

- [Crowdin pricing and hosted-word calculation](https://crowdin.com/pricing)
- [Crowdin for open-source projects and eligibility](https://crowdin.com/product/for-open-source)
- [Crowdin support clarification of the 60,000-word Free limit](https://community.crowdin.com/t/project-suspended-for-exceeding-word-limit-incorrect-word-count/15031)

## Weblate feasibility

Weblate remains the strongest self-hosted fallback: it is open source, supports nested JSON/i18next files, and does not impose hosted-word limits. Its cost is operational rather than per string.

The official Docker guidance recommends at least 3 GB RAM and two CPU cores for a single-host installation, plus PostgreSQL and Valkey/Redis. A production deployment would also need TLS, SMTP, persistent volumes, off-host backups, restore tests, monitoring, deliberate upgrades, and access administration.

Do not create permanent ACC and PROD environments initially. If Crowdin proves unsuitable, use an ephemeral or private Weblate pilot first. Only after the repository round trip is proven should Weblate receive a separate production VM or VPS. Test upgrades and restores using a temporary staging instance created from production backups rather than operating a second always-on stack without a concrete need.

References:

- [Weblate Docker deployment requirements](https://docs.weblate.org/en/latest/admin/install/docker.html)
- [Weblate backup and recovery guidance](https://docs.weblate.org/en/latest/admin/backup.html)
- [Hosted Weblate pricing](https://weblate.org/en/hosting/)

## Runtime and Worker bundle impact

Choosing Crowdin or Weblate does not materially reduce TrackDraw's Cloudflare Worker gzip size. A translation management system changes authoring and review; it does not need to change how production loads catalogs.

A fresh OpenNext build and `wrangler deploy --dry-run` on 2026-08-09 produced:

- 241 static asset files;
- 7,769.86 KiB total Worker upload before compression;
- 2,116.79 KiB Worker upload after gzip;
- approximately 508 KiB of locale JSON across generated static assets.

Locale catalogs are already generated under `public/locales/{locale}/{namespace}.json` and loaded through Cloudflare's `ASSETS` binding. They were not found embedded in the Worker handler. New languages increase static assets, not the Worker script by a full catalog set.

Keep that architecture. Do not use Crowdin's runtime CDN merely to remove repository/static-asset files: it would add a runtime dependency and failure mode without delivering the hoped-for Worker gzip reduction. Re-measure the OpenNext output after large locale additions or framework upgrades.

## Contributor access model

This access model applies regardless of platform:

- Start with a private Crowdin project/pilot while the workflow is being proven.
- Use language-scoped permissions and suggestion/review roles where the selected plan supports them.
- Do not allow direct pushes from contributors to GitHub or `main`.
- Do not give normal translators platform API tokens, GitHub tokens, repository access, source-string edit permissions, or project administration rights.
- Existing target languages may use Crowdin AI/machine translation as their maintained baseline when no regular translator is available. A maintainer owns release sampling and blocking QA; human contributors can improve the baseline later.
- Assign a language leader when a language has recurring human contributors or needs sustained terminology review. Do not make that role a prerequisite for every synchronization round of an existing language.
- Add contributors to language-scoped teams, for example a Chinese translator team limited to `zh-CN` and translatable components only.
- Start new contributors with suggestion-only access where possible. They can propose translations without directly changing the accepted translation state.
- Promote contributors to limited Translate access only after trust is established and the language leader has review capacity.
- Give Review permissions only to maintainers or language leaders who can approve strings for their language.
- Let source string problems be reported through platform comments or source feedback rather than giving translators source-edit rights.
- Keep `dashboard` and `legal` components unavailable to contributor teams.

Practical contribution flow:

1. Contributor asks to help with a language.
2. Maintainer confirms the language scope and available review path, then sends a platform invite.
3. Contributor suggests strings in the translation platform.
4. A language leader, when assigned, handles terminology and contributor feedback; otherwise a maintainer handles blocking QA and release sampling.
5. Automation pulls accepted changes into a normal translation PR.
6. The PR runs locale validation, unresolved-key checks, hardcoded-copy checks, and any relevant UI/export tests before merge.

If a contributor leaves, remove them from platform teams or disable the account. Ordinary translators should never receive repository or service-account tokens.

## Product and repo requirements

- Keep English as the source language and stable fallback.
- Keep the current `lang/{locale}/{namespace}.json` layout unless a proven import/export limitation forces a narrower change.
- Keep route structure unchanged; translation management must not introduce locale-prefixed URLs.
- Keep `dashboard` and `legal` English-only. They can remain in the repo for fallback/source use, but they should stay out of contributor translation workflows.
- Keep all translation changes reviewable as normal pull requests.
- Preserve CI checks for catalog integrity, unresolved English keys, placeholders, and intentional hardcoded-copy exceptions. Missing target keys are allowed only because build and runtime catalogs provide a tested English fallback.
- Support external contributors without requiring direct repository write access.
- Add new languages only when there is either an owner for terminology review or an explicit decision to support a machine-maintained baseline with maintainer sampling, especially for compact UI labels and export/PDF/Race Pack copy.
- Prevent translation growth from making the Cloudflare Worker package grow linearly with every added language.

## Selected pilot

TrackDraw will run a reversible three-month Crowdin pilot from 2026-08-10 through 2026-11-10, shifting the end date if external activation happens later. Crowdin owns `nl`, `de`, and `zh-CN` generation and editing during the pilot; English remains in GitHub. Crowdin AI/machine translation supplies the initial target copy when regular translators are unavailable, with maintainer QA and sampling before the localization pull request is merged. The repository retains all catalogs and production keeps using generated Static Assets.

The setup, update cycle, evaluation criteria, and rollback are documented in `docs/research/crowdin-pilot.md`. The initial repository round trip exposed two integration concerns: native synchronization attributed commits to the authorizing maintainer and exported untranslated ICU messages as English target text. The repository-owned GitHub Action avoids personal commit attribution and skips untranslated target strings so the existing runtime fallback remains responsible for temporary English copy.

## Risks and decisions

- Crowdin Free quotas and feature boundaries can change; verify them in the workspace and avoid relying on an open-source grant.
- A hosted service introduces vendor dependency and stores translation activity outside TrackDraw's infrastructure.
- Self-hosted Weblate adds updates, backups, spam protection, user access, email delivery, and storage.
- PR-based sync keeps repository review clean, but platform state and git state can drift if jobs fail.
- Nested JSON and ICU-style placeholders need explicit checks so translators do not accidentally break runtime formatting.
- Dashboard and legal namespaces stay source-language only. Legal translation would need a separate legal review standard before this boundary changes.
- Adding languages still increases generated static assets, so OpenNext output should be measured before every large new locale.

## Alternatives considered

- **Inlang**: fully git-based, no server to run, but the user found the docs hard to follow — parked for now.
- **POEditor**: hosted and approachable, but not preferred over the Crowdin pilot at this point.
- **Custom script**: a missing/stale-key diff checker in CI — zero infra, but no UI for non-technical translators.

## Status

Crowdin is selected for a bounded three-month pilot; the permanent platform decision remains open until the evaluation. The project and initial repository round trip are active. Repository fallback and GitHub Action synchronization are in place, while registering Action secrets, disabling the native integration, and completing the bot-authored round trip remain operator steps.
