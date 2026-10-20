# MCP request CPU follow-up

## Hosted reproduction

The development recheck after PR #1007 ran against `668ffd493d6bcdadeb54a7309f3626b187592910`, deployed by [run 39475061909](https://github.com/dutchdronesquad/trackdraw/actions/runs/39475061909), Worker version `e9660633-8d87-4b07-9725-1231f3d6a54d`.

Browser OAuth, account/catalog discovery, separate project creation/retry, preview/apply/retry, stale conflict and recovery passed. Studio opened the generated 30 × 20 m track with its two-gate inventory and displayed `dev-668ffd4`. Typical-track analysis and comparison also passed.

The full reference SDK run still failed: one run aborted during pagination of the large fixture (2,001 gates / 6,000 route points), and a second during the typical fixture's `get_overlay`. A later attempt failed during authorization. HTTP responses exposed Cloudflare error 1102. A reduced unauthenticated loop made five protected-resource discovery requests: two returned HTTP 503/error 1102 instead of 200; five corresponding MCP challenges all returned 401. This rules out large geometry as the only cause.

The filtered tail recorded successful requests, including high CPU samples, but did not capture the failing invocations. Error 1102 establishes a Worker resource failure; the exact CPU/memory breakdown for these particular failures is not available. The earlier pre-#1007 tail separately established CPU exhaustion. Token lifecycle, negative-auth and request-budget checks were not reached on the failing full runs; prior deployment or local results do not substitute for this gate.

All new generated development users, owned projects and exact DCR client registrations were deleted afterward. A separate read-only query confirmed zero remaining matching users, projects and clients; token/consent/session rows cascade with the test user/client. Production discovery and MCP remained 404.

## Verified avoidable work

- `getAuth()` rebuilt every plugin and auth context on each request. A regression calling actual provider discovery three times observed three initializations before the fix.
- Public discovery routed through Next/OpenNext and the full auth stack. The reduced loop can fail without any bearer token or design. The local Worker profile included Next module loading, routing and garbage collection on this path.

## Correction

- Reuse initialized auth engines by the actual database binding and configuration (secret, site URL, trusted origins and app environment). Schema-validation gates still create a fresh engine. Failed initialization evicts its entry. Session, token, consent, ownership and rate-limit results are never cached.
- Serve the existing three public discovery URLs directly in the custom Worker, with the same helper used by the Next route. Shared canonical URL/scope definitions contain no auth initialization. Public JSON remains `no-store`; caller-controlled hosts cannot change canonical URLs.
- Compare both metadata documents exactly with the installed provider on development and production origins. Provider default changes therefore fail tests rather than silently changing advertised capabilities. Preserve HEAD, method errors and fallback handling for other well-known routes.

Both regression seams were red before the fix and pass afterward. Local full SDK runs pass on the typical and large fixtures, including creation, reviewed edit/conflict/recovery, oversized-result handling, refresh and revocation. Live session revocation, configuration rotation and database isolation remain covered.

These are implementation and local-runtime results. Repeat the complete hosted reference-client gate on the candidate deployment before accepting #1000/#994. Do not raise CPU settings, change subscriptions or weaken live authorization to conceal this failure.
