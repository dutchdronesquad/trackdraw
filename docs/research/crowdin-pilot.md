# Crowdin localization pilot

Status: repository foundation ready; external Crowdin project activation and initial import remain operator steps.

Pilot window: 2026-08-10 through 2026-11-10. If the GitHub integration is activated later, move the end date so the evaluation still covers three full months.

## Goal

Use Crowdin as the only editing and review surface for Dutch, German, and Simplified Chinese long enough to judge contributor usability, translation quality, maintenance effort, quota pressure, and pull-request noise. English source copy remains owned by normal TrackDraw feature pull requests.

The pilot stays reversible. Translation JSON remains versioned in Git, production continues to load generated Cloudflare Static Assets, and TrackDraw has no runtime dependency on Crowdin.

## Ownership during the pilot

| Content                                        | Source of truth                                     |
| ---------------------------------------------- | --------------------------------------------------- |
| `lang/en/**` product source copy               | GitHub feature pull requests                        |
| `lang/nl/**`, `lang/de/**`, `lang/zh-CN/**`    | Crowdin                                             |
| `lang/en/dashboard.json`, `lang/en/legal.json` | GitHub; excluded from Crowdin                       |
| Production locale assets                       | Generated from the merged Git catalogs during build |

Do not edit target-language JSON directly during the pilot, except for a production emergency that is immediately reconciled back into Crowdin.

## Initial Crowdin setup

1. Create a public, file-based project with English as source and Dutch, German, and Chinese Simplified (`zh-CN`) as targets.
2. Enable moderated project joining and require 2FA for managers.
3. Connect `dutchdronesquad/trackdraw` and synchronize only `main` using the repository `crowdin.yml`.
4. Import existing translations once. Enable source-matching translations because FPV and product terms may intentionally remain English. Approve the imported baseline only after a quick catalog review.
5. Disable continuous translation import from Git and leave source pushes from Crowdin disabled.
6. Keep translation export/manual synchronization disabled until `common.json` has completed one verified round trip.
7. Confirm that Crowdin recognizes nested JSON, ICU plurals, and placeholders before enabling all ten namespaces.

Never commit a Crowdin API token or project credential. The GitHub integration reads `crowdin.yml` without credentials in the repository.

## Normal update cycle

1. A feature pull request changes English source messages and application code.
2. CI validates English key usage, catalog integrity, and hardcoded-copy rules. Target catalogs may temporarily omit new keys.
3. After merge, Crowdin pulls the new English source from `main`.
4. Translators submit changes and a language coordinator approves them.
5. A maintainer manually triggers the Crowdin translation sync.
6. Crowdin opens or updates its localization pull request without pushing directly to `main`.
7. TrackDraw CI rejects stale extra keys, empty values, and placeholder mismatches. Missing target keys remain safe English fallbacks.
8. A maintainer reviews and merges the localization pull request.

During the pilot, prefer one intentional localization pull request per week or release over hourly repository churn.

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
