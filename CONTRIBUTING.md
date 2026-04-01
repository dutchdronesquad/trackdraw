# Contributing

TrackDraw accepts contributions through forks and pull requests. Create your own fork, make a feature branch for the change, push that branch to GitHub, and open a pull request back to this repository when the work is ready for review. The project is local-first, so most changes can be developed and tested entirely on your own fork before you open the PR.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and work in `/studio`.
Shared read-only links open at `/share/[token]`.

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

## Local testing modes

Use the mode that matches the part of the product you are changing.

### `npm run dev`

Use plain Next.js development for:

- landing page work
- editor UI and interactions
- local autosave behavior
- import/export flows that do not depend on Cloudflare runtime services
- most mobile and responsive checks

This is the default contributor workflow.

No env file is required for ordinary `npm run dev`.

### `npm run preview`

Use Cloudflare/OpenNext preview when your change touches:

- stored share publishing and readback
- D1-backed server routes
- cloud-project APIs
- Worker-specific runtime behavior

Typical preview workflow:

```bash
npm run migrate:local
npm run preview
```

Wrangler creates and uses a local D1-backed SQLite state for preview validation, so this mode is the right place to test Cloudflare-specific reads and writes without deploying anything.

If preview mode cannot find a D1 binding, check `wrangler.jsonc` and the local migration state first.

## Auth and magic links

TrackDraw now uses Better Auth for cloud-project and ownership flows.

Local auth setup:

- copy `.dev.vars.example` to `.dev.vars`
- set `BETTER_AUTH_SECRET`

Development behavior:

- magic-link URLs are written to the local preview server log
- authenticated cloud-project routes rely on a real Better Auth session

Contributors do not need any Plunk env vars for local development or preview validation.

Use `npm run preview` when validating sign-in, cloud projects, share ownership, or any D1-backed auth behavior.

Use `npm run dev` when iterating on auth UI only. It now provides a local client-side auth shim for faster header and login-page styling work, but it does not validate real Better Auth sessions or authenticated API routes.

Quick local auth check:

1. `npm run migrate:local`
2. `npm run preview`
3. open `/login`
4. request a magic link
5. copy the URL from the preview server log
6. confirm Studio shows the signed-in state

## Pull requests

- Keep changes targeted and avoid broad refactors.
- Preserve local-first behavior, export/import, share flows, and mobile support.
- Update docs when scripts, routes, or contributor-facing setup meaningfully change.
