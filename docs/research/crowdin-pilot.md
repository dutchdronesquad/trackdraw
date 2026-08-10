# Crowdin localization pilot

Status: Crowdin project activated and initial repository round trip completed; migration from the user-authorized native integration to the repository-owned GitHub Action remains an operator step.

Pilot window: 2026-08-10 through 2026-11-10. If the GitHub integration is activated later, move the end date so the evaluation still covers three full months.

## Goal

Use Crowdin as the only editing and review surface for Dutch, German, and Simplified Chinese long enough to judge contributor usability, translation quality, maintenance effort, quota pressure, and pull-request noise. English source copy remains owned by normal TrackDraw feature pull requests.

The pilot stays reversible. Translation JSON remains versioned in Git, production continues to load generated Cloudflare Static Assets, and TrackDraw has no runtime dependency on Crowdin.

## Ownership during the pilot

| Content                                              | Source of truth                                     |
| ---------------------------------------------------- | --------------------------------------------------- |
| `lang/en-US/**` product source copy                  | GitHub feature pull requests                        |
| `lang/nl-NL/**`, `lang/de-DE/**`, `lang/zh-CN/**`    | Crowdin                                             |
| `lang/en-US/dashboard.json`, `lang/en-US/legal.json` | GitHub; excluded from Crowdin                       |
| Production locale assets                             | Generated from the merged Git catalogs during build |

Do not edit target-language JSON directly during the pilot, except for a production emergency that is immediately reconciled back into Crowdin.

## Initial Crowdin setup

1. Create a public, file-based project with English as source and Dutch, German, and Chinese Simplified (`zh-CN`) as targets.
2. On the ordinary Free plan, keep moderated joining and project-enforced 2FA disabled because those controls are unavailable. Ask maintainers to enable account-level 2FA voluntarily; enable the project controls if the open-source request is approved.
3. Add `CROWDIN_PROJECT_ID` and `CROWDIN_PERSONAL_TOKEN` as GitHub Actions repository secrets. Give the Crowdin token read access to projects and translation status plus read/write access to source files, strings, and translations.
4. In GitHub under **Settings > Actions > General**, allow GitHub Actions to create pull requests. The workflow uses the repository-scoped `GITHUB_TOKEN`; no personal GitHub token is required.
5. Run the `Crowdin` workflow manually once. It synchronizes only Crowdin's `main` branch using the repository `crowdin.yml`.
6. Import existing translations once. Enable source-matching translations because FPV and product terms may intentionally remain English. Approve the imported baseline only after a quick catalog review.
7. Keep repository translation upload disabled after the one-time import. Crowdin remains the source of truth for target catalogs.
8. Confirm that Crowdin recognizes nested JSON, ICU plurals, and placeholders before inviting translators.
9. Disable the native Crowdin GitHub integration, close its open localization pull request, and delete its `l10n_main` service branch. The Action uses `l10n_crowdin` instead.

Never commit a Crowdin API token or project credential. The Action reads both values from GitHub Actions secrets through the environment variable references in `crowdin.yml`.

## Normal update cycle

1. A feature pull request changes English source messages and application code.
2. CI validates English key usage, catalog integrity, and hardcoded-copy rules. Target catalogs may temporarily omit new keys.
3. After merge, the `Crowdin` GitHub Action uploads changed English source files to Crowdin.
4. Translators submit changes and a language coordinator approves them.
5. A maintainer manually runs the `Crowdin` workflow when translations are ready. Running it once per week or release is preferred over a schedule during the pilot.
6. The Action opens or updates `l10n_crowdin` without pushing directly to `main`. The PR and GitHub operation are attributed to `github-actions[bot]`; translation commits use `Crowdin Bot` as their author.
7. TrackDraw CI rejects stale extra keys, empty values, and placeholder mismatches. Missing target keys remain safe English fallbacks.
8. A maintainer reviews and merges the localization pull request.

During the pilot, prefer one intentional localization pull request per week or release over hourly repository churn.

The Action exports with `skip_untranslated_strings` enabled. Crowdin therefore omits untranslated target keys instead of copying English ICU source messages into target catalogs. TrackDraw's tested runtime fallback supplies English until a real translation is available. The Action's commit message deliberately does not contain `[ci skip]`, so localization pull requests remain subject to the normal repository checks. GitHub may require a maintainer to approve workflows initiated by `github-actions[bot]`.

## Runtime fallback

Target catalogs are allowed to lag behind English. Server-side development catalogs and generated `public/locales/**` assets recursively merge the target catalog over English. Existing translations win; missing or empty values use English. Arrays such as landing-page bullets and FAQ entries are merged by position.

Extra target keys are ignored at runtime and rejected by CI. Placeholder changes are also rejected so a translated message cannot silently drop required values.

## Evaluation

Review the pilot on 2026-11-10 using:

- number of active translators and languages with a clear reviewer;
- median time from a merged English string to an approved translation;
- translation pull-request frequency, conflicts, and maintainer time;
- placeholder, terminology, and compact-label issues found in review;
- hosted-word usage and whether the Free or open-source plan remains appropriate;
- contributor feedback compared with editing JSON through GitHub.

Continue when Crowdin materially lowers contributor friction without disproportionate maintenance or licensing risk. Otherwise stop the integration, export and merge the latest approved translations once, remove `crowdin.yml`, and return target-language ownership to GitHub. Git history and the final export preserve all translation work.
