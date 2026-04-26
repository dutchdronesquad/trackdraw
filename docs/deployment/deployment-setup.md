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

## Share retention

Shares become invalid when `expires_at` is reached, but they are not deleted immediately.

The Worker runs a daily cron cleanup and removes:

- revoked shares
- shares that have been expired for more than 30 days

The cron schedule is configured in `wrangler.jsonc`. To test the scheduled cleanup locally, run Wrangler with scheduled testing enabled and hit the scheduled route manually.

```bash
npx wrangler dev --env dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

Cloudflare documents `--test-scheduled` and the local `__scheduled` route for scheduled handler testing:

- https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
