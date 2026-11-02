# Team-project transport comparison

Status: local experiments and OpenNext preview validation completed on 2026-11-02; the single-query conditional polling implementation is ready for review, without deployment. This extends the [Durable Objects evaluation](../planned/durable-objects-resource-evaluation.md). The [original results](team-project-transport-results.json) retain the 18-scenario prototype comparison. The [implementation results](team-project-conditional-polling-results.json) compare all four variants across 24 scenarios, with package versions and source hashes.

## Single-query implementation follow-up

The browser now sends its known revision on background/focus reads. [The production query](../../../src/lib/server/team-project-poll.ts) joins current team membership and edit-session metadata in one statement, always refreshing team name, role, recovery state and editor status. A SQL `CASE` omits `design_json` when the revision matches. Changed designs are normalized and returned in that same response; the extra status-then-full queries from the prototype are gone. Initial loads, explicit reloads, and recovery reads retain full-read semantics. The [controller](../../../src/components/teams/useTeamProjectEditing.ts) preserves canvas/history on metadata-only responses, retains the existing access-failure clearing and request/account fencing, and bounds reads to 12 seconds.

The final 500-item run, with identical fixture and timing assumptions, produced:

| Profile | Variant                          | SQL statements | D1 rows read | Response value bytes |
| ------- | -------------------------------- | -------------: | -----------: | -------------------: |
| Idle    | Current                          |            402 |        1,112 |           12,376,742 |
| Idle    | Single-query conditional polling |            162 |          872 |              421,742 |
| Sparse  | Current                          |            408 |        1,154 |           12,377,202 |
| Sparse  | Single-query conditional polling |            168 |          914 |            2,805,070 |
| Busy    | Current                          |            432 |        1,322 |           12,377,685 |
| Busy    | Single-query conditional polling |            192 |        1,082 |           12,338,573 |

This removes 240 statements and 240 rows read in every profile. Idle response value bytes decrease by 96.6%; busy revisions no longer increase query work. The single-query path reads more idle rows than the original lightweight prototype because it also returns current team name, role, and recovery state; that prototype only returned revision/editor metadata. All variants retain identical writes per profile. This is a local service measurement, not hosted CPU or billing evidence.

Dedicated route tests use the actual signed-cookie/session resolver with migrated SQLite: valid sessions can poll, while removed/expired sessions, banned accounts, forged cookies and removed memberships cannot. Service and controller tests cover metadata changes without a revision, conditional geometry, fresh designs, focus/reload, and failure clearing. All 31 targeted tests and the complete 1,888-test suite pass. The local OpenNext API and desktop/mobile browser checks below complete the preview validation for this change; physical-device and hosted performance acceptance remain separate.

## Finding and next decision

Conditional polling captures almost all the response-size improvement of the conservative Durable Object prototype for unchanged or infrequently changed designs, without introducing a second runtime component. The DO prototype reduces HTTP requests, but replaces viewer polls with WebSocket messages and retains D1 access revalidation. It does not reduce combined database work below conditional polling in this experiment.

Prefer a production proposal for conditional team-project polling first. Before implementation, optimize the changed-revision path: this prototype performs a status query followed by the existing full read, which adds database work whenever the revision changes. Consider a single conditional projection or reuse the authorized status/team result rather than repeating authorization queries. Compare that improvement against this baseline before choosing an implementation. DOs remain a candidate when immediate saved-revision notifications have product value, or when measured hosted HTTP/auth costs justify the additional runtime and invalidation design.

These results establish local operation counts and response sizes, not hosted CPU, energy use, end-to-end browser performance, hibernation billing, or savings on the Cloudflare invoice.

## Reproduce

From the repository root, with the existing Node/npm dependencies installed:

```sh
node scripts/experiments/team-project-transport/compare.mjs /tmp/team-project-transport-results.json
```

The runner needs permission to open local runtime ports. It creates a temporary Miniflare/workerd instance with local D1 and a SQLite-backed Durable Object namespace, then disposes the runtime and removes its state in `finally`. It neither reads `.dev.vars` nor uses the application's Wrangler configuration, deployed bindings, Cloudflare credentials, or live projects. The experiment Worker has synthetic actor inputs and administrative fixture routes; it must never be deployed or mounted in the application.

The runner uses the installed Miniflare 5 `convertV4MiniflareOptions` adapter; no dependency installation or application test-runner migration is required. It now runs the original three variants plus the single-query implementation. The original recorded artifact preserves its earlier source hashes; new runs record the current sources. Experiment files live in [the experiment directory](../../../scripts/experiments/team-project-transport/compare.mjs), outside the production Worker entry point and Next routes.

## Method

There are two fixture sizes (20 and 500 gates), four viewer tabs using the same synthetic viewer account, and one owner/editor. Each scenario executes 30 compressed steps representing ten minutes at the existing 20-second heartbeat interval. Profiles are:

- Idle: no saves.
- Sparse: six saves, one every five steps (100 logical seconds).
- Busy: 30 saves, one every step (20 logical seconds).

Fixture creation, editor acquisition, and schema setup are excluded from measurements. Four initial full viewer loads are included in each variant. Every step renews the editor's existing D1 lease; all saves use the same production revision/lease service. Time is compressed rather than waiting ten minutes: SQL lease timestamps use real local time, and expiry is tested separately by explicitly expiring a lease. This does not exercise browser background throttling or mobile lifecycle behavior.

The runner applies repository migrations transactionally in Node SQLite, then creates the resulting tables, indexes, and triggers in isolated local D1. It does not claim to validate the migration runner against hosted D1. The actual [team read service](../../../src/lib/server/team-projects.ts), [project read service](../../../src/lib/server/projects.ts), [authorization predicates](../../../src/lib/server/project-authorization.ts), and [lease/save service](../../../src/lib/server/team-project-leases.ts) are bundled into workerd. The database boundary is replaced with a wrapper around real local D1 to collect statement metadata. `first()` uses `all()` internally so the same SQL's row metadata can be recorded; response normalization still uses the actual services.

| Variant              | Behavior                                                                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Current service flow | Full `readTeamProject()` response for every viewer on every step. Models the existing hook's periodic reads; does not execute the React hook or Next HTTP route.                                                                                                                                                         |
| Conditional polling  | One authorized projection of revision and editor metadata each step. If the client's known revision differs, include the existing full response in the same HTTP request. No second network round trip is required.                                                                                                      |
| Durable Object       | Initial authorized WebSocket upgrades; saved revisions notify the room inside the save request. Every recipient is reauthorized before a push. Every viewer also sends a check message each step for bounded access revalidation and missed-message reconciliation. A changed revision triggers the same full HTTP read. |

The DO prototype deliberately retains D1 leases, renewals, and revisions. It does not assert that attachments grant indefinite access or introduce a second lease authority. Room state is just socket attachments, not another durable copy of the design. Notification delivery is best effort with periodic reconciliation; this is not an implemented transactional outbox. The missed-notification assertion verifies discovery of a committed revision when a notification is omitted.

Synthetic identity replaces Better Auth in **all three variants**. D1 project membership predicates are real, but cookie/session/token verification, live account bans, token revocation, Next overhead, browser rendering, request compression, and auth-related database reads are not measured. Replacing full API authentication with socket reauthorization could alter both costs and guarantees; these service measurements do not quantify that change.

## Results

For the 500-item fixture, ten logical minutes, one editor and four viewers:

| Profile | Variant             | HTTP requests | Incoming WS messages | SQL statements | D1 rows read | D1 rows written | Response value bytes | Full viewer reads |
| ------- | ------------------- | ------------: | -------------------: | -------------: | -----------: | --------------: | -------------------: | ----------------: |
| Idle    | Current             |           154 |                    0 |            402 |        1,112 |              30 |           12,376,742 |               124 |
| Idle    | Conditional polling |           154 |                    0 |            162 |          752 |              30 |              415,262 |                 4 |
| Idle    | Durable Object      |            38 |                  120 |            166 |          772 |              30 |              413,822 |                 4 |
| Sparse  | Current             |           160 |                    0 |            408 |        1,154 |              48 |           12,377,202 |               124 |
| Sparse  | Conditional polling |           160 |                    0 |            240 |          986 |              48 |            2,810,250 |                28 |
| Sparse  | Durable Object      |            68 |                  120 |            268 |        1,126 |              48 |            2,811,234 |                28 |
| Busy    | Current             |           184 |                    0 |            432 |        1,322 |             120 |           12,377,685 |               124 |
| Busy    | Conditional polling |           184 |                    0 |            552 |        1,922 |             120 |           12,390,377 |               124 |
| Busy    | Durable Object      |           188 |                  120 |            676 |        2,542 |             120 |           12,401,149 |               124 |

For idle viewers, conditional polling reduces response value bytes by **96.6%**, SQL statements by **59.7%**, and D1 rows read by **32.4%** relative to the current service flow. In the sparse profile it reduces response bytes by **77.3%**, but rows read by only **14.6%**. The DO prototype reads 772 versus 752 rows when idle and 1,126 versus 986 when sparse: its upgrades and per-recipient notification authorization explain the difference. All variants have identical D1 writes per profile because leases/saves are unchanged. Reported writes include trigger work, not just top-level statements.

The 20-item fixture has the same operation counts; idle response values decrease from 594,138 bytes to 35,178 with conditional polling or 33,738 with DOs. Larger designs amplify redundant serialization/transfer without changing the number of primary-key lookups in these fixtures.

Busy revisions remove the conditional-download benefit. Polling's extra status query raises reads above the current full response, and DO fan-out adds further authorization work. This is an argument for improving the conditional query, not evidence that large payloads are always harmless.

### Counter definitions and limits

- HTTP requests include initial viewer loads, upgrades, renewals, saves, polls, and changed-revision fetches. DO notifications run inside saves and do not receive an artificial extra HTTP request.
- `doCalls` in the JSON records room upgrade calls and notification RPCs. Incoming check messages are separate. Fewer HTTP requests does not mean fewer network events or zero DO charges.
- SQL counts and rows read/written come from local D1 result metadata, including DO-initiated revalidation. They are not inferred from query count. `bindingBytes` counts serialized result rows returned to service code, excluding D1 metadata.
- Response bytes count uncompressed JSON **values**, or error strings, sent to the client; instrumentation fields, headers, framing, TLS, request bodies, and compression are excluded. This is a response-content comparison, not a total network-traffic measurement. Identical save request bodies are outside that counter for all variants.
- The JSON records local HTTP wall-time percentiles for reproducibility, but they include local runtime, instrumentation, and process scheduling. They are not CPU measurements, do not cover the WS check path, and are not used to rank alternatives.
- No DO storage API writes are introduced by the prototype. D1 counters do not measure Cloudflare's internal socket/attachment persistence or DO billing. Forced eviction confirms local attachment recovery; it does not prove naturally occurring hibernation eligibility, active duration, or hosted billing.
- Saves precede polls within a compressed step. The benchmark does not measure the real-world freshness difference between periodic polling and immediate push, nor coalescing or races during continuous editing.

## Correctness evidence

The runner verifies full/status revision and editor agreement without leaking the session secret, exclusive acquisition, stale revision rejection, outsider denial, discovery after a missed hint, reconnect reconciliation, and a new DO instance restoring the same socket attachment after forced hibernation. It also verifies membership removal denies both socket checks and full reads, expired renewals fail, delayed release cannot release a successor's lease, old saves fail after takeover, active editing prevents archival, and an archived project denies socket checks.

These are local service/runtime assertions. They do not establish real-session authorization, revocation of account tokens, browser draft recovery, two-device races, load saturation, or mobile acceptance. The experiment is not wired into the production application.

## Validation and remaining work

The build/typecheck failures were caused by the generated `cloudflare-env.d.ts` contributing Worker runtime globals to the browser application project: its `Response.json()` and HTMLRewriter `Element` declarations changed the types of unrelated browser APIs. Excluding that generated runtime file from the application TypeScript project removes the collision without weakening strictness or adding casts. `npm run cf-typegen` followed by `npm run type` passes; the explicit Worker/server binding boundaries remain typed.

The 12 ExportDialog failures were reproducible in isolation. Disabling happy-dom's partial `Element.animate` implementation for that test file makes real Framer Motion use its JavaScript/RAF fallback, allowing `AnimatePresence` exit transitions to complete. The same assertions now pass. Production animations are unchanged; desktop category switching was also checked in the real browser.

Current verification:

- `npm run lint`, `npm run type`, `npm run build`, and `npx opennextjs-cloudflare build` pass. Formatting was checked over tracked files; unrelated untracked local experiments were left untouched.
- `npm run test`: 274 files, 1,888 tests passed, including all 22 ExportDialog tests.
- `node scripts/check_worker_size.mjs`: 8,091,100 raw bytes and 2,084,856 gzip bytes, both within repository budgets.
- A local OpenNext preview used a separate temporary configuration, development mode, a temporary auth secret, synthetic accounts, and an isolated migrated D1 directory. No remote resources or real accounts were used for the checks. Cookie policy was configured for the local HTTP origin.
- Twenty live API checks passed: authorized full/conditional reads, `no-store` and `Cookie` in Next's combined `Vary` header, anonymous/outsider/invalid-revision/foreign-origin denial, exclusive same-account/editor sessions, viewer write denial, editor metadata without secrets, changed and acknowledged designs, stale saves, fresh handoff, delayed release, old-session saves, metadata-only team rename, role-loss invalidation, membership removal, and actual sign-out/session revocation.
- Real browser checks covered initial private read-only viewing, acquisition, a second same-account tab showing the current editor with editing disabled, release and takeover, desktop Export → Race Day → Export Race Pack, and a mobile breakpoint (observed 382 × 827 CSS pixels). A mobile title edit reached Saved, and the downloaded JSON was verified as version 2 with that saved title and both track items. Viewport overrides and temporary tabs were reset/closed after validation.

The original prototype run completed 18 scenarios and all 13 safety assertions. Its existing Vitest suite passed (272 files, 1,873 tests); happy-dom emitted teardown AbortError warnings. Repository lint passed. `npm run type` and `npm run build` failed on existing errors in team/dashboard clients and tests (`Response.json()` values inferred as unknown, plus anchor-event typing); the build compiled before failing TypeScript. A separate TypeScript run excluding the experiment directory reproduced the same errors. The implementation follow-up's current validation is recorded above; dependency manifests and the production Worker remain unchanged.

Before production selection:

1. The conditional projection and busy-scenario follow-up above are complete; retain the dedicated unchanged-revision metadata/access tests when reviewing the implementation.
2. The local preview/session/browser checks above are complete. Account-change fencing, read-failure clearing and recovery retain component/service coverage; physical-device background/resume and hosted performance remain follow-up acceptance rather than claimed results of the compressed benchmark.
3. If DOs are still justified, run an isolated development deployment with explicit authorization/invalidation and reconciliation contracts. Measure Worker CPU, auth queries, DO duration/storage, reconnect storms, and push freshness at 1/10/100 rooms. Retain the D1 write fence and a rollback path.
4. Apply account-wide pricing only after measuring the full request path and included allowance usage. Do not extrapolate these synthetic local figures into energy savings or a monthly invoice.
