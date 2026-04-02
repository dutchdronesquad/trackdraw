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

For account auth and real magic-link delivery on deployed environments, `dev.trackdraw.app` and `trackdraw.app` should also provide:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_TRUSTED_ORIGINS` only if you need additional allowed origins beyond `NEXT_PUBLIC_SITE_URL`
- `PLUNK_API_KEY` (required)
- `PLUNK_FROM_EMAIL` (recommended, use a verified sender such as `hello@trackdraw.app`)
- `PLUNK_FROM_NAME` (optional, defaults to `TrackDraw`)
- `PLUNK_REPLY_TO_EMAIL` (optional, only if replies should go to a different mailbox)

Generate a separate `BETTER_AUTH_SECRET` for each deployed environment. Example:

```bash
openssl rand -base64 32
```

Add deployed auth and mail secrets to Cloudflare Worker secrets for the matching environment, not to the repository.

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

The current cron runs daily at `03:17 UTC`.

To test the scheduled cleanup locally, run Wrangler with scheduled testing enabled and hit the scheduled route manually.

```bash
npx wrangler dev --env dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=17+3+*+*+*"
```

Cloudflare documents `--test-scheduled` and the local `__scheduled` route for scheduled handler testing:

- https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
