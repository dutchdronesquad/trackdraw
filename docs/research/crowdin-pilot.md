# Crowdin localization pilot

Status: Crowdin project activated and initial repository round trip completed; migration from the user-authorized native integration to the repository-owned GitHub Action and enabling automatic translation remain operator steps.

Pilot window: 2026-08-10 through 2026-11-10. If the GitHub integration is activated later, move the end date so the evaluation still covers three full months.

## Goal

Use Crowdin as the only generation, editing, and review surface for Dutch, German, and Simplified Chinese long enough to judge machine-assisted quality, contributor usability, maintenance effort, quota pressure, and pull-request noise. English source copy remains owned by normal TrackDraw feature pull requests. Dedicated translators are welcome but are not required for every existing target language: Crowdin AI/machine translation supplies the initial version and humans can improve it later.

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
9. Pause the native Crowdin GitHub integration by clearing its sync schedule before merging the Action workflow. Keep the connection available for rollback until the first Action-generated pull request succeeds.
10. Under **Settings > Auto-Translate**, enable automatic translation when new source content is uploaded. Process untranslated strings only, use Crowdin AI or a configured machine-translation engine, and do not replace existing human translations.
11. Give the automatic translator TrackDraw-specific guidance: concise browser UI copy, an informal but clear product tone, preservation of `TrackDraw`, FPV terminology, ICU placeholders, units, and technical tokens, and no invented product behavior.
12. Confirm the selected engine and plan cover Dutch, German, and Simplified Chinese. Keep the auto-translation accuracy/queue results available for the maintainer review before export.

Use this as the starting instruction for Crowdin AI and refine it through the glossary rather than adding conflicting instructions per batch:

```text
Translate concise TrackDraw browser UI copy from en-US into the target language.
Use natural, clear, informal product language rather than a word-for-word translation.
Preserve TrackDraw, FPV terms, URLs, file formats, keyboard shortcuts, units,
technical tokens, HTML/tags, and every ICU placeholder exactly. Prefer the project
glossary and translation memory. Keep labels compact enough for controls. Do not
invent features, promises, privacy behavior, or technical meaning. Return only the
translated message.
```

Auto-Translate is a Crowdin project setting, not a repository setting. Enabling or changing it is therefore an explicit operator action and cannot be inferred from `crowdin.yml` or the GitHub Action alone.

Never commit a Crowdin API token or project credential. The Action reads both values from GitHub Actions secrets through the environment variable references in `crowdin.yml`.

## QA settings during the pilot

Keep QA checks enabled, but distinguish runtime-breaking syntax from linguistic review:

- set **Variables mismatch**, **ICU syntax**, and **Tags mismatch** to **Error**;
- set **Spelling mistakes**, punctuation, capitalization, and length checks to **Warning** so a false positive cannot block an otherwise valid translation;
- leave untranslated strings untranslated instead of saving the English source as a target translation.

Generated translations are provisional, not disposable. Crowdin QA must pass before export, and a maintainer reviews a small sample plus sensitive or space-constrained strings. A dedicated language coordinator is not required for each synchronization round. When a human later corrects a translation, retain that translation and configure future auto-translation runs to skip it.

Before starting the localization workflow, the maintainer checks:

- no blocking variables, ICU, or tag mismatch remains;
- every changed placeholder is preserved exactly;
- all warnings, privacy/security copy, destructive actions, and export instructions added in the batch have been reviewed;
- at least five other new strings per target language, or all of them when the batch is smaller, read plausibly in context;
- compact controls do not contain obviously excessive copy;
- English text is retained only for intentional product or technical terminology.

An `ISSUES FOUND` or `Spellcheck failed` language indicator means at least one suggestion has an unresolved QA finding; it does not mean the complete language import failed. Open the issue count for that language and review a sample before changing project-wide settings. Add legitimate product names, FPV terminology, acronyms, and retained English technical terms to **Settings > QA Checks > Spellcheck Ignore list**. Glossary terms are not added to this ignore list automatically.

## Normal update cycle

1. A feature pull request changes English source messages and application code.
2. CI validates English key usage, catalog integrity, and hardcoded-copy rules. Target catalogs may temporarily omit new keys.
3. After merge, the `Crowdin` GitHub Action uploads changed English source files to Crowdin.
4. Crowdin automatically translates newly uploaded, untranslated strings. Translation memory and existing human translations remain preferred and are not replaced.
5. Human contributors can suggest or approve improvements when available, but their absence does not block the existing languages.
6. A maintainer checks the auto-translation queue, blocking QA findings, placeholders, and a representative sample. Pay extra attention to compact controls, warnings, export copy, and FPV terminology.
7. A maintainer manually runs the `Crowdin` workflow when the batch is ready. Running it once per week or release is preferred over a schedule during the pilot.
8. The Action opens or updates `l10n_crowdin` without pushing directly to `main`. The PR and GitHub operation are attributed to `github-actions[bot]`; translation commits use `Crowdin Bot` as their author.
9. TrackDraw CI rejects stale extra keys, empty values, and placeholder mismatches. Missing target keys remain safe English fallbacks.
10. A maintainer reviews and merges the localization pull request. Machine-generated wording can ship after this lightweight review and be corrected later through Crowdin.

During the pilot, prefer one intentional localization pull request per week or release over hourly repository churn.

The Action exports with `skip_untranslated_strings` enabled. Crowdin therefore omits untranslated target keys instead of copying English ICU source messages into target catalogs. TrackDraw's tested runtime fallback supplies English until a real translation is available. The Action's commit message deliberately does not contain `[ci skip]`, so localization pull requests remain subject to the normal repository checks. GitHub may require a maintainer to approve workflows initiated by `github-actions[bot]`.

## Agent-generated target translations

Coding agents must keep normal feature work English-only, even if they can translate all supported languages. Generating target copy directly in Git bypasses Crowdin's glossary, translation memory, QA state, and later human corrections.

If a branch already contains useful agent-generated target translations, choose one of these paths before merge:

1. Remove the target-only edits and let Crowdin auto-translate the merged English source; or
2. Treat the edits as a deliberate one-time baseline import, review them, import them into Crowdin, confirm the resulting Crowdin export, and only then merge the Crowdin-generated localization PR.

Do not permanently enable repository translation upload and do not merge the same target changes independently through a feature PR. After reconciliation, Crowdin resumes ownership of all target catalogs.

## Native integration cutover

1. Add both Action secrets and allow GitHub Actions to create pull requests.
2. Pause the native integration's sync schedule in Crowdin.
3. Merge the repository Action workflow.
4. Close the native integration's localization pull request without merging it and delete `l10n_main` from GitHub.
5. Manually run the `Crowdin` workflow from the GitHub Actions tab.
6. Review the bot-authored `l10n_crowdin` pull request and wait for the normal TrackDraw checks.
7. After that round trip succeeds, remove the native GitHub integration from Crowdin. Do not remove the Crowdin project, its files, translations, translation memory, or glossary.

## Runtime fallback

Target catalogs are allowed to lag behind English. Server-side development catalogs and generated `public/locales/**` assets recursively merge the target catalog over English. Existing translations win; missing or empty values use English. Arrays such as landing-page bullets and FAQ entries are merged by position.

Extra target keys are ignored at runtime and rejected by CI. Placeholder changes are also rejected so a translated message cannot silently drop required values.

## Evaluation

Review the pilot on 2026-11-10 using:

- machine-translation coverage, active human contributors when available, and the amount of maintainer review required;
- median time from a merged English string to an approved translation;
- translation pull-request frequency, conflicts, and maintainer time;
- placeholder, terminology, and compact-label issues found in review;
- hosted-word usage and whether the Free or open-source plan remains appropriate;
- contributor feedback compared with editing JSON through GitHub.

Continue when Crowdin materially lowers contributor friction without disproportionate maintenance or licensing risk. Otherwise stop the integration, export and merge the latest approved translations once, remove `crowdin.yml`, and return target-language ownership to GitHub. Git history and the final export preserve all translation work.
