# Deployment Setup

TrackDraw uses a split runtime setup:

- `local` for fast development and local Cloudflare preview
- `dev` on `dev.trackdraw.app`
- `production` on `trackdraw.app`

## Runtime split

- `npm run dev` is regular Next.js development
- `npm run preview` is local Cloudflare/OpenNext validation
- Cloudflare root config is production
- Cloudflare `env.dev` is the development deployment target

## Database split

Use separate PostgreSQL databases and credentials per environment.

- development should point to a dedicated development database
- production should point to a separate production database
- do not reuse production credentials for local or development workflows

TrackDraw also enforces a runtime/database environment match:

- `TRACKDRAW_RUNTIME_ENV=development` must only talk to a development database
- `TRACKDRAW_RUNTIME_ENV=production` must only talk to a production database

If those do not match, the server-side database layer fails fast.

## Local env files

Local Cloudflare preview uses both:

- `.env.local`
- `.dev.vars`

The local Hyperdrive connection string should point to the development database.

See [`.env.example`](../.env.example) and [`.dev.vars.example`](../.dev.vars.example).

## Wrangler

[`wrangler.jsonc`](../wrangler.jsonc) is structured as:

- root config: production
- `env.dev`: development

The development Hyperdrive binding should use its own Hyperdrive ID and local dev connection string.

## Migrations

Development migrations:

```bash
npm run migrate:up:dev
```

Production migrations are intentionally gated:

```bash
DATABASE_URL_PRODUCTION=postgres://...
CONFIRM_PRODUCTION=trackdraw-production
npm run migrate:up:production
```

## Validation flow

Typical local workflow:

```bash
npm install
npm run migrate:up:dev
npm run dev
```

When validating Cloudflare-specific behavior:

```bash
npm run preview
```

Use preview for stored-share publishing, Hyperdrive-backed reads, and other Worker-specific flows.
