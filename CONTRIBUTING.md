# Contributing to TrackDraw

TrackDraw is a browser-based FPV race track designer with a landing page, full editor, public gallery, account-backed project flows, exports, and read-only shared views.

This document covers contributor workflow: setup, local runtime modes, validation, and PR expectations. For repo ownership boundaries and agent-specific conventions, see [AGENTS.md](AGENTS.md).

## Product Guardrails

Treat these flows as high-risk when changing nearby code:

- Editing in `/studio`, including selection, transforms, autosave, undo/redo, import, and export
- Mobile editing and mobile inspector/tool controls
- Public sharing through `/share/[token]`
- Gallery publishing and gallery card destinations
- Read-only embed/share viewing
- Account, role, dashboard, and API-key flows

Core editing, autosave, import/export, recovery, and sharing should remain usable without an account.

## Prerequisites

- Node.js 20+
- npm
- Wrangler, when validating Cloudflare/D1/OpenNext behavior

Install dependencies:

```bash
npm install
```

## Runtime Modes

Use `npm run dev` for most local work:

```bash
npm run dev
```

This is the fastest mode for:

- Landing page work
- Editor UI and local editor behavior
- Canvas, inspector, and export work that does not need Cloudflare services
- Responsive and mobile UI checks
- Auth UI styling that does not need real sessions

Use preview mode when the behavior depends on Cloudflare runtime, D1, Better Auth sessions, share ownership, gallery publishing, dashboard authorization, API keys, or deployed-route behavior:

```bash
npm run migrate:local
npm run preview
```

## Local Auth

For real local Better Auth validation:

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Generate a secret:

```bash
openssl rand -base64 32
```

3. Set `BETTER_AUTH_SECRET` in `.dev.vars`.
4. Run `npm run migrate:local`.
5. Run `npm run preview`.
6. Open `/login`.
7. Request a magic link.
8. Use the URL printed in the preview server log.

For email template styling in non-production environments, use `/dev/email-preview` to preview auth mail variants without sending a real message.

## Roles And Dashboard Checks

Use two modes:

- `npm run dev` for fast dashboard UI work with the local auth shim
- `npm run preview` for real Better Auth sessions and D1-backed authorization behavior

In `npm run dev`, the simulated role is stored in localStorage:

```js
localStorage.setItem("trackdraw-dev-auth-role", "moderator");
```

Valid values:

- `user`
- `moderator`
- `admin`

Refresh after changing the value. Clear it with:

```js
localStorage.removeItem("trackdraw-dev-auth-role");
```

To bootstrap the first admin after migrations, update D1 directly.

Local preview database:

```bash
wrangler d1 execute DB --local --env dev --command "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
```

Remote development database:

```bash
wrangler d1 execute DB --remote --env dev --command "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
```

Authorization checklist for preview or deployed runtime:

1. Sign in as a normal `user` and confirm `/dashboard` is not accessible.
2. Promote an account to `moderator` and confirm `/dashboard` loads while admin-only modules such as `/dashboard/users` and `/dashboard/audit` stay inaccessible.
3. Promote an account to `admin` and confirm `/dashboard/users` and `/dashboard/audit` both load.
4. Change another user's role from `/dashboard/users` and confirm an `account.role.changed` entry appears in `/dashboard/audit`.

## Common Commands

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

## Validation

Run these after non-trivial code changes when the environment allows it:

```bash
npm run lint
npm run test
npm run type
```

For larger or route/runtime-sensitive changes, also run:

```bash
npm run build
```

Run `npm run preview` and validate the relevant flow when touching:

- Better Auth sessions
- D1-backed data
- Share ownership
- Gallery publishing
- REST APIs
- API keys
- Cloudflare/OpenNext runtime behavior
- Scheduled cleanup or deployed route assumptions

Useful lightweight checks:

```bash
git diff --check
```

Component tests can opt into a browser-like environment per file:

```ts
// @vitest-environment happy-dom
```

Keep tests under `tests/`, grouped by product area or module. Prefer shared helpers from `tests/helpers` before adding new local mock factories.

## Flow-Specific Checks

Editor changes:

- Check desktop and mobile behavior.
- Verify selection, drag, rotate, undo/redo, autosave, and inspector updates when relevant.
- For 3D interaction work, sanity-check direct manipulation controls such as path elevation, ladder elevation, dive gate tilt/elevation, and rotation handles.

Share and gallery changes:

- Keep `/share/[token]` compatible.
- Keep gallery cards pointing at the canonical share route.
- Fail safely on invalid, missing, or oversized share payloads.

Export and serialization changes:

- Treat backward compatibility as the default.
- Validate import/export round trips when touching `TrackDesign`, normalization, SVG, Velocidrone, flythrough, or share payload code.

REST API changes:

1. Run `npm run preview`.
2. Sign in and create an API key from account settings.
3. Call `/api/v1/me`, `/api/v1/projects`, one project `/track`, and one project `/overlay` with `Authorization: Bearer <api_key>`.
4. Open `/api/docs` and confirm documented endpoints match shipped routes.
5. Revoke the key and confirm bearer requests no longer authenticate.

Landing page changes:

- Preserve SEO metadata, structured data, and clear routes into `/studio`.

## Track Items

A track item is a product-level element such as a gate, flag, cone, ladder, tower, dive gate, label, start pads, or race line.

For new or changed track items, start with the ownership checklist in [AGENTS.md](AGENTS.md#adding-a-track-item). That checklist covers the registry, 2D metrics/rendering, 3D preview, inspector fields, SVG export, flythrough export, and format-specific exports.

At minimum, add focused tests for registry completeness and one behavior that makes the item different, such as geometry, rendering, export, catalog switching, timing, or setup estimates.

## Documentation

Use the docs by audience:

- `README.md`: product-facing overview
- `CONTRIBUTING.md`: contributor setup, commands, runtime modes, and validation workflow
- `AGENTS.md`: durable repo ownership and agent conventions
- `docs/`: deployment notes, roadmap, research, and longer planning
- `CHANGELOG.md`: shipped or release-bound user-facing changes

When changing routes, deployed runtime behavior, Cloudflare bindings, Worker guards, scheduled jobs, public media handling, or WAF/rate-limit assumptions, check `docs/deployment/deployment-setup.md`.

Do not include machine-specific absolute paths in committed docs.

## Pull Requests

- Keep PRs focused on one feature, fix, or documentation change.
- Use a Conventional Commit-style title, such as `feat: Improve map reference controls`.
- Explain the user-facing effect.
- Mention the validation you ran.
- Call out skipped validation and why.
- Reference related issues or discussions when relevant.

Use `SSIA` only for very small PRs where the title fully explains the change.

## Changelog

Update `CHANGELOG.md` only for shipped or release-bound user-facing changes.

Write for end users first:

- Lead with what they can do or what feels better.
- Keep entries compact.
- Group small related changes into one stronger theme.
- Avoid dependency bumps, refactors, or internal cleanup unless there is a clear user-visible effect.
