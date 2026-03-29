# Deployment Plan

Historical note: this document predates the switch from the earlier PostgreSQL/Hyperdrive direction to Cloudflare D1 for persisted share storage. Use [deployment-setup.md](./deployment-setup.md) for the current operational setup.

This document captures the intended deployment direction for TrackDraw as the app moves beyond static hosting.

## Decision Summary

TrackDraw should move away from GitHub Pages as the production target.

The preferred deployment model is:

- Vercel for pull request preview deployments
- Cloudflare Workers for staging and production
- Cloudflare D1 as the first durable datastore for published share state

This is a hybrid setup on purpose:

- Vercel already fits the current preview workflow well
- Cloudflare Workers is a better fit than static export for dynamic share routes, metadata, and OG image generation
- D1 removes the extra connectivity and operational overhead that came with the earlier home-hosted database plan

## Why GitHub Pages No Longer Fits

TrackDraw is no longer a clean static-export project.

Current and planned features that conflict with static hosting:

- Dynamic share routes at `/share/[token]`
- Dynamic metadata per shared design
- Dynamic OG image generation for share pages
- Future server-backed share persistence
- Likely future API-style publish and retrieval flows

The current build failure around `/share/[token]/opengraph-image` is a symptom of that mismatch, not an isolated issue.

## Share Model Migration

This deployment migration should be planned together with the share-model migration.

TrackDraw currently uses payload-in-URL sharing. That has been useful for a local-first first version, but it is not the long-term model.

The intended direction is:

- move share links away from full design payloads in the URL
- store published share state in a database
- resolve share URLs through a server-backed lookup flow
- keep `/share/[token]` as the canonical public route

This matters for deployment because the new share model depends on having a real runtime and backend connectivity.

Expected implications:

- share creation becomes a write operation to a database
- share viewing becomes a read operation from a database
- share tokens should become durable identifiers rather than compressed full-state payloads
- share metadata and OG image generation should read from stored share state
- invalid, missing, revoked, or oversized share states must fail safely

Backward compatibility should be treated as a product concern.

The current expectation is:

- legacy URL-embedded share links are deprecated
- the old decoding path should eventually be removed
- during the transition period, legacy links should either still open safely or fail cleanly with a clear fallback path
- the codebase should not keep the legacy share logic indefinitely once the stored-share model is established

At minimum, the migration plan should decide:

- how long legacy URL-embedded shares remain supported
- whether old share links are republished into stored share objects
- whether old share links are converted on open, on republish, or not at all
- what the failure UX should be once full legacy support is removed

The preferred direction is to preserve `/share/[token]` as the public route shape even if the token format changes underneath.

## Data Model Direction

PostgreSQL is the expected first backend for persisted shares.

That should be treated as the first step in a broader backend capability, not as a one-off storage hack.
It should also not be treated as a permanent hard dependency.

The infrastructure should leave room for future expansion toward:

- user accounts
- persisted projects
- cross-device access
- opening and editing projects from another device after login
- future ownership and access-control rules around projects and published shares

This does not mean those features need to ship now.

It does mean the migration should avoid assumptions that make later account and project storage unnecessarily painful.
It also means the integration should avoid tight coupling to infrastructure-specific behavior where a more portable boundary is practical.

Examples of decisions that should stay forward-compatible:

- use stable database identifiers for shares
- separate unpublished working state from published share state
- avoid coupling public share tokens directly to internal project identifiers if that may become a security or product constraint later
- keep the Next.js runtime and database integration flexible enough to support authenticated APIs later
- treat PostgreSQL as the first durable backend layer, not just as a share-link helper
- isolate backend access behind a small server-side data layer so PostgreSQL can later be replaced or relocated without broad app rewrites
- avoid leaking storage-specific schema details directly into broad app code where a narrower domain model is sufficient
- keep share publishing and retrieval flows defined by TrackDraw domain rules first, not by raw storage API shapes

## Backend Portability

PostgreSQL on Proxmox is the current likely first choice, but the infrastructure should assume that the backend may later move to another platform.

Possible future directions could include:

- managed PostgreSQL elsewhere
- Cloudflare-native storage and data services
- another hosted database or backend service
- a custom backend if account and collaboration requirements outgrow the first database setup

Because of that, the first backend integration should aim for portability:

- keep backend-specific code concentrated in a narrow server-side layer
- keep route handlers and server actions dependent on TrackDraw service functions rather than raw backend SDK calls everywhere
- define stable TrackDraw concepts such as `share`, `published snapshot`, `project`, and `user` independently from the storage vendor
- avoid making infrastructure decisions that assume PocketBase remains the backend forever

The goal is not to build an abstract enterprise platform up front.
The goal is to avoid a migration trap.

## Target Deployment Model

### Pull Requests

- Trigger: `pull_request`
- Platform: Vercel
- Purpose: fast preview URLs for review and UI validation

This part of the workflow should remain unchanged unless there is a strong reason to consolidate platforms later.

### Development

- Trigger: pushes to `main`
- Platform: Cloudflare Workers
- Purpose: validate the real Cloudflare runtime before release
- Suggested URL: `https://dev.trackdraw.app`

This environment exists to catch runtime differences between Vercel previews and Cloudflare Workers before a release is published.
It should be treated as the live development version of `main`, not as production.

### Production

- Trigger: `release.published`
- Platform: Cloudflare Workers
- Purpose: the public live environment
- Suggested URL: `https://trackdraw.app`

Production deploys should remain explicit and release-gated.

## Git Strategy

A full Git Flow model is not required.

Recommended workflow:

- Work on feature branches
- Open pull requests into `main`
- Use Vercel preview deployments for PR review
- Merge into `main` when ready
- Let `main` deploy to Cloudflare development
- Publish a GitHub Release when the current `main` state is ready for production
- Let `release.published` deploy production to Cloudflare

This keeps deployment discipline without adding `develop`, `release/*`, and `hotfix/*` branches prematurely.

## Infrastructure Responsibilities

### Vercel

Used only for preview environments created from pull requests.

### Cloudflare Workers

Used for the deployed Next.js runtime in development and production.

Reasons:

- supports dynamic Next.js features better than static export
- works well with explicit GitHub Actions based deployments
- gives more control over staging and production release flow

### PostgreSQL

PostgreSQL is already running on Proxmox and should be treated as the first backend for persisted share state.

Expected role:

- durable share storage
- canonical storage for published share objects
- future publish/retrieve flows
- possible project and user-linked data storage if needed later

Important architecture note:

- Cloudflare Workers should not blindly connect directly to a home-hosted PostgreSQL instance without a deliberate connectivity plan

This needs to be decided early because it affects how the first share backend is introduced.

Viable directions may include:

- a narrowly scoped backend API in front of PostgreSQL
- a secure tunnel or proxy approach
- relocating PostgreSQL later to a managed host while keeping the same app-facing service layer

Operational requirements:

- reverse proxy
- backups
- firewall and port-forwarding hygiene
- uptime awareness
- rate limiting where appropriate

## Cloudflare Cost Expectations

Cloudflare Workers appears financially reasonable for TrackDraw at this stage.

Relevant official pricing at the time of writing:

- Workers Free: `100,000 requests/day`
- Workers Paid: minimum `$5/month`
- Workers Paid includes `10 million requests/month`
- Workers Paid includes `30 million CPU ms/month`

This suggests:

- development should be inexpensive
- early production should likely remain inexpensive
- the project does not need to optimize too early around Cloudflare cost

Official references:

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

## Implementation Direction For Existing Project

Cloudflare documents both automatic and manual setup paths for existing projects.

TrackDraw should use the manual path.

Reason:

- the repository already has deployment workflows
- the target setup is hybrid rather than Cloudflare-only
- we want explicit control over staging and production behavior

Official guidance for existing Next.js projects:

- install `@opennextjs/cloudflare`
- install `wrangler`
- add a `wrangler.jsonc`
- add an `open-next.config.ts`
- add Cloudflare-oriented package scripts
- add `.open-next/` to `.gitignore`

Reference:

- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

## Planned Repository Changes

The following repo changes are expected when implementation starts.

### Dependencies

Add:

- `@opennextjs/cloudflare`
- `wrangler`

### Config Files

Add:

- `wrangler.jsonc`
- `open-next.config.ts`
- `public/_headers` for static asset cache headers if needed by the Cloudflare setup

Update:

- `.gitignore` to ignore `.open-next/`
- `package.json` scripts for Cloudflare build/deploy support

### GitHub Actions

Keep:

- existing linting and validation workflow

Replace or refactor:

- existing GitHub Pages production deploy workflow

Add:

- `development` deploy workflow for Cloudflare on push to `main`
- `production` deploy workflow for Cloudflare on `release.published`

## GitHub Secrets And Environment Requirements

Expected GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Expected public environment values:

- `NEXT_PUBLIC_SITE_URL=https://trackdraw.app` for production
- `NEXT_PUBLIC_SITE_URL=https://dev.trackdraw.app` for development
- backend connection or API configuration once stored shares are introduced

Cloudflare should also be configured with the appropriate custom domains for development and production.

## Rollout Sequence

Recommended order of work:

1. Remove GitHub Pages as the intended deployment target.
2. Add Cloudflare/OpenNext dependencies and config.
3. Add a development deploy from `main`.
4. Validate that TrackDraw runs correctly on Cloudflare Workers.
5. Define the database-backed share model and compatibility rules for legacy links.
6. Decide the safe app-to-database connectivity pattern between Cloudflare Workers and PostgreSQL.
7. Integrate PostgreSQL for stored share publish/read flows behind a narrow server-side layer.
8. Move share metadata and OG generation onto the stored share model.
9. Add release-based production deploys.
10. Keep Vercel previews active throughout.

## Risks To Validate Early

- runtime differences between Vercel and Cloudflare Workers
- behavior of dynamic metadata and OG image generation on Cloudflare
- any package assumptions that depend on full Node runtime behavior
- legacy share-link compatibility during the move from URL payloads to stored shares
- the connectivity and security model between Cloudflare Workers and home-hosted PostgreSQL
- future auth behavior once persisted accounts and projects are introduced
- operational reliability of home-hosted PostgreSQL

## Current Recommendation

Proceed with:

- Vercel previews
- Cloudflare development from `main`
- Cloudflare production from `release.published`
- PostgreSQL on Proxmox as the first persisted datastore, with a deliberate integration layer between the app runtime and the database

This is the most pragmatic path that preserves the existing review flow while removing the static-hosting constraint that now blocks the product.
