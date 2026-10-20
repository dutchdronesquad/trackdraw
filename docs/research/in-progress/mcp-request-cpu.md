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

## Post-#1011 hosted recheck and bounded-page follow-up

Merge `1734d0bd05534765560e13056c2894fe44732f15` deployed successfully in [run 39512650912](https://github.com/dutchdronesquad/trackdraw/actions/runs/39512650912), Worker `fb470ee8-b18d-4f68-80ca-897e3d6d806a`. One complete hosted SDK run passed all generated workflows, pagination, oversized-result refusal, negative-auth, durable-budget, refresh and revocation checks; Studio confirmed the expected generated field/inventory and deployed version. Another full run failed during large pagination, and a later reduced attempt failed on the unauthenticated MCP challenge plus five immediate repetitions (503/1102). Two separate five-pair public discovery/challenge loops passed. This is intermittent, not accepted availability. The filtered tail still did not capture a failed invocation; do not assign an exact CPU/memory cause from these responses alone. Generated remote fixtures and clients were removed, with zero matching records verified separately.

Two remaining avoidable costs are addressed:

- The unauthenticated MCP challenge still loaded the Next route. A shared pure guard now applies the existing origin/query checks and returns the existing canonical 401 challenge directly from the custom Worker. Every supplied credential continues through live OAuth authentication, ownership and request-budget checks. The Next route uses the same guard.
- Paged `get_track` previously converted every shape and every polyline point into the API contract before slicing. Shared track-envelope and shape serializers now let MCP slice first, retaining the REST contract, full-track counts, global timing-marker titles and revision-bound cursors. Shape summaries never convert points; point pages convert only the selected coordinates. Loading and normalization of the owned design still happen on every request; no private designs or authorization decisions are cached.

A route-level SDK regression with an unreadable off-page shape fails before the pagination correction and passes after it. Another regression proves shape summaries and a point page do not visit off-page coordinates. In a local Node CPU probe of 2,001 generated gates plus 6,000 route points (20 warmups, 100 measurements), full API serialization measured 3.30 ms median versus 0.155 ms for a 50-shape page; normalization separately measured 0.549 ms. These isolate serialization work only, not total Worker CPU or hosted availability.

Validation for this follow-up: all 1,567 tests, lint, TypeScript, formatting, Next/OpenNext build and the handler-size check pass (2,028,293 bytes gzip / 2,252,800 budget). The official SDK passes full local Cloudflare workflows for both typical and large fixtures, including creation/edit/conflict/recovery, bounded outputs, refresh and revocation. A separate local Worker inspector run of 12 missing-credential challenges returns 401 throughout without Next request-handler frames. These checks do not establish hosted acceptance; repeat the original deployed loop after merge/deployment.
