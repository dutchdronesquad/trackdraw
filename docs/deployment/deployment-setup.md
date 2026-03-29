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

## Local env files

Local Cloudflare preview does not need a database connection string anymore.

Plain Next.js development can still use:

- `.env`

Wrangler-local overrides can live in:

- `.dev.vars`

No committed example env files are kept in the repo anymore.

## Wrangler

[`wrangler.jsonc`](../../wrangler.jsonc) is structured as:

- root config: production
- `env.dev`: development

Each environment should bind its own D1 database through `d1_databases`.

Before the first deploy, replace the placeholder `database_id` values in [`wrangler.jsonc`](../../wrangler.jsonc) with the real Cloudflare D1 database IDs for:

- production
- development

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

Use preview for stored-share publishing, D1-backed reads, and other Worker-specific flows.

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
