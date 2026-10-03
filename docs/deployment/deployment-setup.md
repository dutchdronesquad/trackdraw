# Deployment Setup

TrackDraw uses a split runtime setup:

- `local` for fast development and local Cloudflare preview
- `development` on `dev.trackdraw.app`
- `production` on `trackdraw.app`

## Runtime split

- `npm run dev` is regular Next.js development
- `npm run preview` is local Cloudflare/OpenNext validation
- Cloudflare root config is production
- Cloudflare `env.dev` is the development deployment target
- GitHub Actions uses the GitHub Environment `cf-dev` for the development deploy from `main`
- GitHub Actions uses the GitHub Environment `cf-prod` for the production deploy on `release.published`

### Static public shell

The production build must pre-render `/`, `/studio`, `/privacy`, and `/terms`. OpenNext cache interception reads these four prerenders from the read-only Workers Static Assets incremental cache without loading `NextServer` or executing page rendering. The lightweight Worker routing layer is still invoked for page URLs; this distinction matters when interpreting invocation metrics. Their initial HTML uses the English catalog; a client provider loads the saved or browser locale from `/locales/{locale}/{namespace}.json` after hydration. Theme preference is applied by an inline bootstrap in the document head before the page paints.

Do not move request-time auth, database, gallery, share, or embed reads into this shell. `/gallery`, `/share/[token]`, `/embed/[token]`, dashboard/account pages, auth handlers, and API routes must remain dynamic.

Validate the boundary with `npm run build` or `npx opennextjs-cloudflare build`. Next.js should mark the four public shell routes with `○` and the protected/data-backed routes with `ƒ`. `open-next.config.ts` deliberately filters the read-only Static Assets cache to `/index`, `/studio`, `/privacy`, and `/terms`; do not broaden it to account-backed or revalidated routes. After deployment, compare CPU time and `exceededCpu` events with the pre-deployment baseline, and confirm cache interception avoids `NextServer` work on these paths. Worker invocation count alone will not fall because page requests still cross the routing layer.

## Build dependencies

Keep `esbuild` as an explicit development dependency: the OpenNext Cloudflare CLI imports it directly, so deployment must not rely on another tool hoisting it into the root dependency tree. The PR build checks `opennextjs-cloudflare build --help` after `npm ci` to catch missing adapter dependencies before merge; deployment still runs the complete OpenNext build.

## Database split

TrackDraw uses Cloudflare D1 for persisted share storage.

- production should use its own D1 database binding
- development should use a separate D1 database binding under `env.dev`
- local preview uses Wrangler's local D1 state for the development environment
- a scheduled Worker cleanup removes expired or revoked shares after a retention window
- the same scheduled cleanup removes raw, privacy-safe product events after 180 days

## Local development requirements

Local Cloudflare preview does not need a database connection string anymore.

Use these local files as needed:

- no env file is required for ordinary `npm run dev`
- `.dev.vars` is used for Wrangler/OpenNext preview overrides
- `.dev.vars.example` shows the minimum preview-auth setup

Minimum local setup depends on what you are validating:

- for ordinary UI work in `npm run dev`: no Cloudflare or Plunk setup is required
- for local Cloudflare preview with D1-backed routes: run `npm run migrate:local`
- for local auth validation in preview: set `BETTER_AUTH_SECRET` in `.dev.vars`

Generate `BETTER_AUTH_SECRET` as a long random string, for example:

```bash
openssl rand -base64 32
```

Use a different secret for each environment (`local`, `development`, and `production`). Store it in `.dev.vars` for local preview and in Cloudflare Worker secrets for deployed environments. Do not commit it to the repository.

Local development and preview do not require Plunk. Magic-link URLs are written to the local preview server log.

`npm run preview` uses Wrangler's local D1 state, backed by a local SQLite database under Wrangler's local data directory. That gives you a deploy-like database path for share and account-backed API testing without touching Cloudflare development or production data.

## Wrangler

[`wrangler.jsonc`](../../wrangler.jsonc) is structured as:

- root config: production
- `env.dev`: development

Each environment should bind its own D1 database through `d1_databases`.

Before the first deploy, replace the placeholder `database_id` values in [`wrangler.jsonc`](../../wrangler.jsonc) with the real Cloudflare D1 database IDs for:

- production
- development

## Cloudflare deployment requirements

For real Cloudflare development or production deployment, you need:

- a Cloudflare account with Workers and D1 enabled
- separate D1 databases for `development` and `production`
- real `database_id` values filled into [`wrangler.jsonc`](../../wrangler.jsonc)
- GitHub Environment secrets configured for the deploy workflows

For account auth and real account email delivery on deployed environments, `dev.trackdraw.app` and `trackdraw.app` should also provide:

Worker secrets:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_TRUSTED_ORIGINS` only if you need additional allowed origins beyond `NEXT_PUBLIC_SITE_URL`
- `PLUNK_API_KEY` (required for magic links, email verification, change-email confirmation mails, and account retention notices; must be a secret/server key, not a public/browser key)

Worker vars:

- `PLUNK_FROM_EMAIL` (required for TrackDraw's current transactional mail flow; use a verified sender on the transactional subdomain, e.g. `noreply@emails.trackdraw.app`)
- `PLUNK_FROM_NAME` (optional, defaults to `TrackDraw`)
- `PLUNK_REPLY_TO_EMAIL` (optional; set to a real mailbox such as `info@trackdraw.app` so replies reach a human)

Generate a separate `BETTER_AUTH_SECRET` for each deployed environment. Example:

```bash
openssl rand -base64 32
```

Add deployed auth and mail secrets to Cloudflare Worker secrets for the matching environment, not to the repository.
Keep non-secret mail configuration in [`wrangler.jsonc`](../../wrangler.jsonc) so GitHub-driven deploys do not drift from dashboard-only vars.

## Production protection

TrackDraw should protect the Worker both in code and at Cloudflare's edge.

The repository-level guard in [`custom-worker.ts`](../../custom-worker.ts) rejects unsafe non-API page methods before requests reach OpenNext. This specifically protects against invalid Server Action probes such as `POST /studio` with a bogus `next-action` header. TrackDraw does not use Server Actions, and page routes are expected to be `GET`, `HEAD`, or `OPTIONS` only. Legitimate writes should go through `/api/*`.

Recommended Cloudflare dashboard setup:

### Block invalid page writes

Create this as a WAF custom rule.

Where to create it:

- New Cloudflare dashboard: select the `trackdraw.app` zone, open `Security` → `Security rules`, then choose `Create rule` → `Custom rule`.

Rule settings:

- Rule name: `Block unsafe methods on page routes`
- Field/expression mode: use `Edit expression`
- Expression:
  ```text
  not (
    http.request.uri.path eq "/api"
    or starts_with(http.request.uri.path, "/api/")
  )
  and http.request.method in {"POST" "PUT" "PATCH" "DELETE"}
  ```
- Action: `Block`
- Deploy after saving.

Create a second WAF custom rule for obvious POST Server Action probes:

- Rule name: `Block invalid Server Action probes`
- Field/expression mode: use `Edit expression`
- Expression:
  ```text
  http.request.method eq "POST"
  and http.request.headers["next-action"][0] ne ""
  and not (
    http.request.uri.path eq "/api"
    or starts_with(http.request.uri.path, "/api/")
  )
  ```
- Action: `Block`
- Deploy after saving.
- Keep this rule `POST`-only. Do not block `GET` or `HEAD` requests just because a crawler or proxy sends an unexpected `next-action` header; discovery paths such as `/robots.txt`, `/robot.txt`, and `/sitemap.xml` should remain crawlable.

### Rate-limit CPU-sensitive pages

Create this as a WAF rate limiting rule for public routes that can create meaningful Worker rendering load.

Where to create it:

- New Cloudflare dashboard: select the `trackdraw.app` zone, open `Security` → `Security rules`, then choose `Create rule` → `Rate limiting rules`.

Use route families instead of a hand-maintained list of individual pages. Keep API writes and account/dashboard pages out of this rule; they need endpoint-specific protection.

Rule settings:

- Rule name: `Limit CPU-sensitive public routes`
- Field/expression mode: use `Edit expression`
- Expression:
  ```text
  not cf.client.bot
  and (
    http.request.uri.path eq "/gallery"
    or starts_with(http.request.uri.path, "/share/")
    or starts_with(http.request.uri.path, "/embed/")
  )
  ```
- Scope: covers the dynamic gallery, shared tracks, and embeds. Studio is served as a static asset and does not need a Worker CPU rate limit. Add new route families here only when they render user/content-heavy pages.
- Characteristics: use `IP`.
- Threshold: `120 requests` per `10 seconds`.
- Action: `Block`.
- Duration: `10 seconds`.

Additional guidance:

- Do not add every new public route to Cloudflare manually. Add only route families that are proven to create meaningful Worker rendering load.
- Keep API rate limits separate and endpoint-specific. `/api/*` has different write semantics, authentication behavior, and user-impact risks than public page rendering.
- Keep verified bots allowed for public gallery/share discovery. The rate limiting expression excludes them through `not cf.client.bot`.
- Keep `/robots.txt`, common typo probes such as `/robot.txt`, and `/sitemap.xml` out of this rate limit. These requests are crawler-driven by design, and not every useful crawler is guaranteed to match Cloudflare's verified bot field.
- When investigating `Worker exceeded CPU time limit`, group events by `http.request.uri.path`, method, user agent, and timestamp. If the spike aligns with the daily cron in [`wrangler.jsonc`](../../wrangler.jsonc), inspect retention cleanup. Otherwise prioritize public SSR/API traffic.

Cloudflare references:

- Workers CPU limits: <https://developers.cloudflare.com/workers/platform/limits/>
- Workers error observability: <https://developers.cloudflare.com/workers/observability/errors/>
- WAF custom rules in the dashboard: <https://developers.cloudflare.com/waf/custom-rules/create-dashboard/>
- WAF rate limiting rules: <https://developers.cloudflare.com/waf/rate-limiting-rules/>
- Create rate limiting rules in the dashboard: <https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/>
- Rate limiting best practices: <https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/>

### R2-backed public site media

If a landing-page or other public site asset is too large for `public/`, store it in a public R2 bucket and expose it through the fixed site media host `https://media.trackdraw.app`.

Typical flow:

1. create a bucket, for example `trackdraw-media`
2. upload the asset under a stable path such as `landing/video-demo.webm`
3. expose the bucket through the public/custom domain `media.trackdraw.app`

Example URL shape used by the site code:

- base URL: `https://media.trackdraw.app`
- asset path: `/landing/video-demo.webm`
- resolved asset URL: `https://media.trackdraw.app/landing/video-demo.webm`

Gallery previews use the same public media host. For gallery opt-in to upload preview images from the app runtime, add a Cloudflare R2 binding named `MEDIA_BUCKET` that points at the public media bucket exposed on `media.trackdraw.app`.

### Locale catalog assets

Translation catalogs are generated into `public/locales/` by `npm run i18n:sync-assets`. The directory is ignored by git and is refreshed before local development and inside the production build script. Preview and deploy run the OpenNext build step, which calls `npm run build` and therefore uses the same generated assets.

During the Crowdin pilot, target catalogs may temporarily omit new English keys. Asset generation recursively merges each target over English, including nested objects and arrays, so missing or empty translations use English until Crowdin returns an approved value. Local server-side catalog reads apply the same fallback before rendering.

OpenNext serves these generated locale JSON files through the existing `ASSETS` binding. Dynamic routes keep only the namespace list and loading logic in Worker code; `en`, `nl`, `de`, and future contributor languages are loaded per namespace from static assets. Source catalogs and generated assets use the same regional directory names (`en-US`, `nl-NL`, `de-DE`, and `zh-CN`), while frontend product locale identifiers remain stable. `StaticLanguageProvider` reads English namespaces from disk during prerender instead of importing catalogs into the shared dynamic root or Worker bundle.

`dashboard` and `legal` remain English-only and are intentionally generated only under `public/locales/en-US/`.

## Mail deliverability

If magic-link emails arrive in spam, treat that as a deliverability problem rather than a template problem.

Transactional email uses a dedicated sending subdomain separate from the root domain to avoid SPF/DKIM/DMARC conflicts. DNS and sender configuration are managed outside this repository.

## Migrations

Local D1 migrations:

```bash
npm run migrate:local
```

Development migrations:

```bash
npm run migrate:up:dev
```

The development deploy workflow applies D1 migrations before deploying the Worker.

Production migrations are intentionally explicit:

```bash
npm run migrate:up:production
```

Migration `0012_product_events.sql` adds the product analytics event store used by the admin metrics dashboard. Apply it before deploying code that records product events or queries activation, usage, and retention metrics.

Migration `0013_cleanup_unlisted_gallery_entries.sql` removes legacy gallery rows that were created automatically for ordinary account shares. It leaves the underlying shares and any gallery rows with preview media untouched.

Migration `0014_embed_referrer_daily.sql` adds privacy-minimized daily embed-source aggregates. Apply it before deploying embed referrer collection or returning embed-source summaries from the account shares API. The scheduled cleanup removes these aggregates after 90 days.

Migration `0015_product_metrics_contract.sql` upgrades product events to contract version `1.0.0`, adds per-row expiry, database deduplication for session-scoped events, and the signed-in product-analytics objection preference. Apply it before deploying the versioned `/api/product-events` endpoint or its preference route.

Migration `0016_product_metric_daily_aggregates.sql` adds identifier-free UTC daily snapshots of each metric's contract-defined 7- or 28-day window, stored measurement coverage, and the minimal signed-in creator activation timestamp required by the finalized 30-day `MTR-005` cohort. Apply it before deploying scheduled metric aggregation. The migration starts measurement conservatively on the next complete UTC day; it never converts older projects, shares, users, or legacy event rows into invented product events.

Migration `0017_localization_demand_daily.sql` adds identifier-free UTC daily localization-demand counters and registers the independent `L10N-001` measurement start. Apply it before deploying `/api/localization-demand` or the dashboard localization view. Country is derived from Cloudflare request context and is never stored with an IP address, session, account, project, or event.

Migration `0019_product_metrics_export_failure_details.sql` advances the product metrics measurement state to contract version `1.1.0` and extends the existing deduplication indexes to accept both compatible v1 contract versions. Apply it before deploying structured `export.failed` events or the exact-attempt dashboard drilldown.

Migration `0021_account_activity.sql` adds `users.last_active_at`. Apply it before deploying account activity tracking. Existing accounts start with the latest valid account creation, session creation, session update, or migration timestamp. The migration timestamp is a conservative adoption floor, so old or missing history cannot make an existing account immediately eligible for inactivity deletion. Administrative profile edits are not evidence of authenticated use.

Migration `0022_account_retention_notices.sql` adds durable first/final account notice records and an activity-update trigger that resets them atomically. Apply it before deploying the warning task. It does not delete accounts or cloud data.

Migration `0023_account_deletion.sql` installs the shared account-deletion lifecycle and durable media cleanup work list. Apply it before deploying automatic deletion. The same database trigger handles admin deletion, Better Auth self-deletion, and cron deletion atomically.

Mail rendering and the Plunk client are shared runtime-independent modules. The custom Worker supplies mail configuration through its bindings; the Next.js adapter retains `server-only` and reads server environment variables. Worker bundling needs no alias for the Next.js marker.

### Account retention warnings

The dashboard Email Preview page includes both retention templates, their subjects, and HTML/plain-text previews with fixed sample dates. It uses the same builders as real notices and sends no mail.

The daily cron sends transactional Plunk notices after eleven calendar months of authenticated inactivity and seven days before the scheduled twelve-month removal date. UTC calendar months clamp to the last day of the target month. The first email shows the approximate inactivity duration in months; the final email emphasizes that it is the last warning. Both show a concrete UTC date and link to the normal sign-in flow; sign-in or authenticated use starts a new period without a separate keep-account flag. The guard always protects a valid, non-expired session and conservatively protects unknown session expiry. Marketing opt-in and product analytics preferences do not gate these service notices. The sender omits Plunk's `subscribed` property to preserve existing contact preferences.

Each run processes at most 25 accounts. A unique notice per account, activity timestamp, and stage plus a five-minute database claim prevents duplicate cron delivery. Claims are rechecked against current activity and sessions immediately before sending. Reactivation removes all old notice state; a mail already in flight cannot be recalled, but cannot recreate the canceled timeline. A delayed first warning grants at least one calendar month to respond; a delayed final reminder grants at least seven days. The final notice's stored `removal_at` takes precedence if a delay extends the earlier date.

Provider acceptance is recorded in `sent_at`; it is not a promise of inbox delivery. Plunk receives a stable `Idempotency-Key` per notice. Retries within 23 hours reuse it, including recovery when Plunk accepted a mail but its response or the database acknowledgment was lost. [Plunk's documented key retention](https://docs.useplunk.com/api-reference/public-api/sendEmail) is 24 hours, so an unacknowledged older attempt is held for reconciliation instead of risking a duplicate. `notice_health` reports sent, failed, and uncertain counts without account details; uncertain attempts make the task fail while other cron owners continue. Investigate provider delivery evidence before changing an uncertain row: record confirmed acceptance, or clear the pending attempt and replace its ID only if non-acceptance is confirmed. Never mark uncertain delivery as sent without evidence.

### Permanent account deletion

The daily account owner deletes at the twelve-calendar-month anniversary, without an extra month or a recovery window. Both first and final notices must have acknowledged provider acceptance for the current activity timestamp. Both announced deadlines and at least seven days after final acknowledgment must have elapsed. Late warnings can extend removal to honor the promised response period; missing, invalid, or uncertain notice evidence prevents deletion. Stored content, account role, marketing preferences and analytics preferences do not extend the inactivity period. Valid or unknown session expiry always protects the account.

Selection is bounded to 25 candidates. Each destructive `DELETE` rechecks the exact activity timestamp, twelve-month boundary, sessions and notices in the same atomic statement as the account lifecycle trigger. New activity before deletion preserves the account and all its content. A database error rolls back all related deletion. Admin and self-deletion use the same lifecycle without the inactivity guard.

The lifecycle removes archived and active projects, layout presets, owned or project-linked shares, gallery listings, embed referrer counters, linked raw product events, creator activation facts, retention notices, API keys, sessions, accounts, passkeys and account-linked verification/audit records. Better Auth magic-link email payloads, user-ID tokens and passkey challenges are removed as well. New manual/self-deletion audit entries retain counts or the action only, without the deleted identity. Identifier-free metric aggregates remain service statistics.

Gallery removal atomically records the preview object keys in `account_deletion_media`, including canonical keys for concurrent uploads. The account and content are already permanently gone: this list contains no account snapshot or recovery data. R2 deletion is retried until acceptance, at most 100 objects per run, including when no accounts are newly eligible. Failed or missing R2 bindings leave keys pending and fail the account owner; other cron owners continue. Admin and self-deletion also attempt immediate media cleanup. Media routes require a current gallery reference, so an object awaiting R2 cleanup is unavailable. An upload finishing after gallery deletion is added back to the work list. Media already downloaded by a visitor cannot be recalled.

Before production activation, apply all migrations and verify the DB and MEDIA_BUCKET bindings. Run the local full-data and reactivation tests and inspect account-owner logs. Deploying the code enables permanent removal for accounts that satisfy every guard; rolling back code cannot restore deleted accounts.

## Validation flow

Typical local workflow:

```bash
npm install
npm run migrate:local
npm run preview
```

When validating Cloudflare-specific behavior:

```bash
npm run preview
```

Use preview for:

- Better Auth sign-in and magic-link verification
- cloud-project APIs
- stored-share publishing and readback
- D1-backed reads and writes
- other Worker-specific flows

Recommended local auth test flow:

1. set `BETTER_AUTH_SECRET` in `.dev.vars` or equivalent local env
2. run `npm run migrate:local`
3. run `npm run preview`
4. open `/login`
5. request a magic link
6. copy the link from the local server log
7. confirm Studio shows the signed-in state and authenticated APIs stop returning `401`

## Retention Cleanup

### Account activity

Authenticated browser use, successful sign-in, Better Auth session checks, and valid API-key use refresh `users.last_active_at` at most once every 24 hours. The existing session/user lookup avoids a write for recent activity; the update also checks persisted activity to prevent duplicate writes from concurrent requests. New accounts receive an initial timestamp through Better Auth. Activity tracking is operational account data and remains active when product analytics is disabled.

`isAccountInactive()` requires activity older than the caller's cutoff and no valid, non-expired session for the account. Unknown activity or session expiry prevents an inactivity classification. This guard protects long-lived sessions even if activity recording fails or the timestamp is stale. Admin `lastLoginAt` continues to mean the latest session creation time. This foundation does not schedule warnings or delete inactive accounts; those lifecycle steps remain separate work.

### Scheduled cleanup

Shares become invalid when `expires_at` is reached, but they are not deleted immediately.
API keys are managed by Better Auth. Revoked keys are deleted through the API Key plugin, and expired key records are removed by scheduled cleanup after the retention window.

The Worker runs a daily cron cleanup and removes:

- inactive accounts after twelve calendar months, acknowledged warnings and the promised grace period
- gallery preview objects recorded by the shared deletion lifecycle
- shares revoked more than 7 days ago, based on `revoked_at`
- temporary shares expired for more than 7 days, based on `expires_at`
- API keys that have been expired for more than 90 days
- raw product events whose per-row 180-day expiry has passed (with a legacy created-at fallback)
- privacy-minimized daily product metric aggregates older than 24 months
- privacy-minimized daily localization-demand aggregates older than 24 months

Active published shares are never selected by share cleanup.

The seven scheduled owners run concurrently and settle independently. Within the product-event task, daily aggregation completes before expired raw events are deleted. If aggregation fails or still has recoverable backfill work, raw-event deletion is skipped for that run so a retry cannot lose an unaggregated period. Each task emits one privacy-safe JSON log with `event: "scheduled_cleanup_task"`, its `task`, `status`, `deleted_rows`, `duration_ms`, `cron`, and `scheduled_at`. Account-notice logs additionally report `notice_health`; sends are never counted as deleted rows. Product-event success logs also report the bounded aggregation health: aggregated days and rows, last complete day, remaining or unrecoverable backfill days, and aggregate rows deleted. A gap older than raw retention marks metric coverage invalid instead of silently inventing or comparing missing history. Failures additionally include the error name and a single-line, length-limited message, but never a share token, API key, session identifier, email address, or event payload. A final `scheduled_cleanup_summary` log reports the task counts and total deleted rows.

If one task fails, the remaining tasks still finish and report their results. The scheduled handler rejects only after all tasks have settled so Cloudflare records the cron invocation as failed. Retrying is safe: metric rows use deterministic keys with upserts, and data cleanup queries are threshold-based `DELETE` operations. Account-notice retry behavior follows the bounded provider window described above. Aggregation catches up at no more than seven complete UTC days per invocation and the query helper combines stored daily snapshots with only today's small live raw-event window.

The cron schedule is configured in `wrangler.jsonc`. It runs at 00:17 UTC so the previous complete UTC day is aggregated shortly after it closes. To test the scheduled cleanup locally, run Wrangler with scheduled testing enabled and hit the scheduled route manually.

```bash
npx wrangler dev --env dev --test-scheduled
curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=17+0+*+*+*&format=json"
```

Cloudflare documents scheduled handler testing and cron triggers here:

- https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
