# Contributing to TrackDraw

Thanks for contributing to TrackDraw. This repo powers a browser-based drone race track planner with a marketing site, a full editor, and read-only shared views. The product is already feature-rich, so small, safe changes are usually better than broad refactors.

## Product boundaries

- Core surfaces are `/`, `/studio`, `/gallery`, and `/share/[token]`.
- Editing, autosave, import/export, recovery, and sharing should stay usable without requiring an account.
- Mobile is a supported product surface.
- Shared links should keep working on the canonical `/share/[token]` route in read-only mode. Gallery entries should continue to open through that route rather than a separate detail page.

If your change touches editor interactions, sharing, export, serialization, or mobile UI, assume regressions are expensive and validate accordingly.

## Stack and structure

TrackDraw is a Next.js 16 app built with React 19 and Tailwind CSS 4. The editor uses Zustand for state, Konva for the 2D canvas, and Three.js for 3D preview. Auth runs through Better Auth, and the deployed runtime uses OpenNext on Cloudflare with D1 and R2-backed gallery preview media.

```text
src/
├── app/         Routes, API handlers, metadata
├── components/  Landing page, editor, dialogs, canvas, inspector
├── lib/         Geometry, export, sharing, auth/server helpers
├── store/       Zustand state, undo/redo, autosave, persistence
└── types/       Shared TypeScript types
docs/            Planning, deployment, research
public/          Static assets
migrations/      D1 migrations
```

## Setup

Prerequisites:

- Node.js 20+
- npm

Install dependencies:

```bash
npm install
```

For most work, use:

```bash
npm run dev
```

This is the default mode for landing-page work, editor UI, local project behavior, import/export work that does not depend on Cloudflare runtime services, and responsive/mobile checks.

Use preview mode when you need D1, Worker runtime behavior, or real auth-backed flows:

```bash
npm run migrate:local
npm run preview
```

## Auth preview

For local Better Auth validation:

1. Copy `.dev.vars.example` to `.dev.vars`
2. Generate a secret:

```bash
openssl rand -base64 32
```

3. Set `BETTER_AUTH_SECRET` in `.dev.vars`
4. Run `npm run migrate:local`
5. Run `npm run preview`
6. Open `/login`
7. Request a magic link
8. Use the URL printed in the preview server log

Use `npm run dev` when you are only changing auth UI. Use `npm run preview` when you need real sessions, authenticated APIs, share ownership, gallery publishing, moderation, or account-backed projects.

For email template styling work on non-production environments, use `/dev/email-preview` to preview the current auth mail variants without sending a real message.

## Roles and dashboard verification

Use the auth/roles dashboard work in two modes:

- `npm run dev` for fast UI work with the local dev auth shim
- `npm run preview` for real Better Auth sessions and D1-backed authorization behavior

### Local role switching in `npm run dev`

The dev auth shim stores the simulated role in localStorage under `trackdraw-dev-auth-role`.

Use the browser console:

```js
localStorage.setItem("trackdraw-dev-auth-role", "moderator");
```

Valid values are `user`, `moderator`, and `admin`.

After changing it, refresh the page. The local dev session will resolve with that role on the next load.

To clear the override:

```js
localStorage.removeItem("trackdraw-dev-auth-role");
```

### First admin bootstrap

After the role migration has run, promote the first admin directly in D1.

Local preview database:

```bash
wrangler d1 execute DB --local --env dev --command "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
```

Remote development database:

```bash
wrangler d1 execute DB --remote --env dev --command "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
```

Production database:

Run the equivalent `UPDATE users ...` statement in the Cloudflare D1 dashboard or via Wrangler against production.

### Authorization verification checklist

For local preview or deployed runtime checks:

1. Sign in with a normal `user` account and confirm `/dashboard` is not accessible.
2. Promote an account to `moderator` and confirm `/dashboard` loads but admin-only modules such as `/dashboard/users` and `/dashboard/audit` stay inaccessible.
3. Promote an account to `admin` and confirm `/dashboard/users` and `/dashboard/audit` both load.
4. Change another user's role from `/dashboard/users` and confirm a new `account.role.changed` entry appears in `/dashboard/audit`.

Use `npm run preview` when you need the real Better Auth and D1-backed version of this flow.

## Common commands

```bash
npm run dev
npm run preview
npm run build
npm run lint
npm run test
npm run test:coverage
npm run type
npm run format
npm run format:check
npm run migrate:local
npm run migrate:up:dev
npm run migrate:up:production
```

## Working guidelines

- Prefer minimal, targeted changes.
- Preserve the existing visual language unless redesign is the explicit goal.
- Reuse existing helpers and types before adding new abstractions.
- Keep TypeScript strictness intact.
- Do not break import/export, autosave, recovery, sharing, or read-only viewing while changing adjacent features.

Pay extra attention to these areas:

- Landing page work should preserve SEO metadata, structured data, and clear routes into `/studio`.
- Editor changes should be checked on both desktop and mobile before you change component contracts.
- Share-flow and gallery work should preserve token compatibility, keep gallery cards pointed at `/share/[token]`, and fail safely on invalid or oversized payloads.
- Export and serialization work should treat backward compatibility as the default.

## Verification

Baseline checks:

```bash
npm run lint
npm run test
npm run type
```

Coverage report:

```bash
npm run test:coverage
```

Unit, regression, and component tests live under `tests/`. Prefer keeping tests outside `src/` and group them by product area or module so editor, share, export, and UI coverage can grow without mixing test files into shipped code.

Pure logic suites run in the default Vitest `node` environment. Component tests can opt into `happy-dom` per file with `// @vitest-environment happy-dom`, which keeps browser-like coverage available without changing the whole suite over to a DOM runtime.

For larger changes, also run:

```bash
npm run build
```

Also verify the relevant user flow, especially for `/studio`, `/share/[token]`, mobile editing, import/export, recovery, and preview-mode auth/share behavior.

For 3D editor interaction work, also sanity-check live inspector feedback and direct-manipulation controls such as path elevation handles, floating ladder placement, and rotation handles.

## Pull requests

- Keep PRs focused on one feature, fix, or documentation change.
- Explain the user-facing effect.
- Reference related issues or discussions when relevant.
- Mention which validation you ran.

## Documentation

- `README.md`: product-facing overview
- `CONTRIBUTING.md`: contributor workflow and setup
- `docs/`: planning, deployment, deeper internal references
- `CHANGELOG.md`: shipped, user-visible changes only
  Write changelog entries for end users first: describe what is new or improved in plain product language, not internal architecture or planning terms.

## Need help?

Start with [README.md](README.md), then [docs/README.md](docs/README.md). If product direction is unclear, open an issue or discussion before making a larger change.
