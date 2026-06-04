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

## Database split

TrackDraw uses Cloudflare D1 for persisted share storage.

- production should use its own D1 database binding
- development should use a separate D1 database binding under `env.dev`
- local preview uses Wrangler's local D1 state for the development environment
- a scheduled Worker cleanup removes expired or revoked shares after a retention window

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
- `PLUNK_API_KEY` (required for magic links, email verification, and change-email confirmation mails; must be a secret/server key, not a public/browser key)

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
    http.request.uri.path eq "/studio"
    or http.request.uri.path eq "/gallery"
    or starts_with(http.request.uri.path, "/share/")
    or starts_with(http.request.uri.path, "/embed/")
  )
  ```
- Scope: covers Studio, gallery, shared tracks, and embeds. Add new route families here only when they render user/content-heavy pages.
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

Shares become invalid when `expires_at` is reached, but they are not deleted immediately.
API keys are managed by Better Auth. Revoked keys are deleted through the API Key plugin, and expired key records are removed by scheduled cleanup after the retention window.

The Worker runs a daily cron cleanup and removes:

- revoked shares
- shares that have been expired for more than 30 days
- API keys that have been expired for more than 90 days

The cron schedule is configured in `wrangler.jsonc`. To test the scheduled cleanup locally, run Wrangler with scheduled testing enabled and hit the scheduled route manually.

```bash
npx wrangler dev --env dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

Cloudflare documents `--test-scheduled` and the local `__scheduled` route for scheduled handler testing:

- https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
