# Team ownership recovery validation

Validation for [#1043](https://github.com/dutchdronesquad/trackdraw/issues/1043), performed against an isolated local Cloudflare preview and D1 database on 23 October 2026. No production migration, deployment or external email delivery was performed.

## Lifecycle and authorization

All migrations through `0036_team_inactivity_succession.sql` were applied locally. Disposable accounts authenticated through the normal magic-link request, verification and session flow, with authentication rate limits enabled. Local development mail fallback was used.

- Scheduled account retention deleted the inactive owner while preserving team projects and canonical public snapshots. Recovery rejected new editing sessions and project changes while allowing existing members to read/export.
- Two eligible editors submitted ownership applications through authenticated HTTP requests. Fixture clock advancement and delivery acknowledgements accelerated the waiting periods. Running the actual minute-45 scheduled handler promoted the first completed eligible applicant.
- An authenticated administrator corrected ownership of that same team. A stale owner correction returned 409; a non-administrator directory request returned 403. Database foreign-key checks passed.
- Final scheduled recovery cleanup removed the disposable team's projects and revoked its public snapshot. Migrated SQLite regression tests cover gallery preservation and media cleanup queuing.

Fixture clock changes and delivery acknowledgements establish runtime transitions, not real elapsed thirty/ninety-day periods or provider delivery. No message was sent to fixture addresses. Live third-party MCP client acceptance remains separate; the full suite covers the shared Studio/REST/MCP authorization boundary.

## Dashboard interaction and responsive layout

The Teams directory was checked with search, empty results and Needs attention filtering. Team details use the same shadcn Sheet frame as Users/Gallery: default full-height square edges, 448 px desktop width, dark backdrop, close control and modal focus behavior. Inside that frame, the selected team design is retained: larger team heading, inline metadata, member table, recovery details and a contextual Change owner action beside the current owner, above Members. The directory keeps its normal full width behind the overlay.

Desktop at 1440 × 1024 and mobile at 390 × 844 were checked in authenticated Chrome. Mobile uses an 88dvh bottom drawer, a fixed header and scrollable content; recovery details, notice delivery and owner actions remain reachable without horizontal overflow. Expanded delivery identifiers wrap within the drawer. The owner confirmation exposes only eligible editors, requires an audit reason, and cancel returns to the team details without changing ownership. The temporary viewport override was reset afterwards.

## Automated checks

- `npm run lint`, `npm run type`, `npm run i18n:check` and `npm run i18n:scan-hardcoded` passed. Hardcoded-copy scanning found zero new findings; the existing baseline remains.
- Full Vitest suite: 267 files and 1,831 tests passed. The focused dashboard/sidebar/recovery component tests also passed.
- The production Next.js/OpenNext Cloudflare build passed after the final Sheet change.
- `git diff --check` passed.

Regression coverage includes eligibility snapshots, removed/rejoined membership, sessions and bans, first-completion ordering, atomic owner corrections and audit rollback, stale owner rejection, reminder lead times, bounded scheduled work, uncertain provider delivery, final purge, authorization, CSRF and request limits.

## Rollout boundary

Announce the policy, apply migration 0036 and then deploy the application. Existing owners begin a fresh full warning cycle. Verify the configured mail provider and scheduled-task results after deployment; a missing or ambiguous delivery holds the relevant transition. Application rollback does not restore completed ownership transfers or deleted content.
