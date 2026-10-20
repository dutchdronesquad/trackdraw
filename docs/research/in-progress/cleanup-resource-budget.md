# Scheduled cleanup resource budget

The daily cleanup shares one Workers Free invocation across eight owners. Independent batch sizes previously allowed a full run to exceed both the D1 query and subrequest budgets.

## Change

- Delete up to 100 queued R2 keys in one bulk operation, then acknowledge exactly those keys in one D1 statement. The 100-key limit also respects D1's 100 bound-parameter ceiling.
- Limit account warnings and eligible account removals to two candidates each per daily run. Larger queues remain durable and drain over subsequent days. Warning delivery and removal can therefore be delayed under sustained backlog; response periods never become shorter. Inspect notice health, account cleanup failures and queue progress after deployment.
- Preserve authoritative session/activity checks, acknowledged warning requirements, atomic deletion/audit, grace periods and the seven-day metric backfill ceiling.

## Evidence

A controlled migrated-SQLite fixture contains 25 warning candidates, 25 distinct eligible removal candidates, 100 queued media keys and seven complete days of metric backfill. Fake mail/R2 providers prevent external effects.

| Full fixture                                  | Before | After |
| --------------------------------------------- | -----: | ----: |
| SQL statements (including batched statements) |    353 |    47 |
| Mail requests                                 |     25 |     2 |
| R2 delete requests                            |    100 |     1 |
| Conservative combined operations              |    478 |    50 |

The after run uses 41 actual D1 binding calls plus three external calls. Counting every batched SQL separately is a conservative extra guard: D1 SQL stays below 50, and the combined conservative ceiling is 50. Injected mail, R2, media acknowledgment, notice acknowledgment and account-deletion failures stay within the same ceiling. Failed media acknowledgment retains all selected keys even if R2 already deleted the objects.

The committed regression exercises the full successful invocation with 101 queued media keys and verifies that the extra key and unprocessed accounts remain. Focused lifecycle tests cover failure/retry, concurrent additions, account reactivation, live sessions and full warning periods.

An isolated local Cloudflare runtime also exercised the actual cleanup function against real local D1/R2 bindings: 101 synthetic objects drained as 100 then one, followed by an empty idempotent retry. Every response returned 200; no remote binding or persistent application data was involved.

These are operation-count measurements, not hosted Worker CPU measurements or production savings. No live cleanup was triggered. The current production and development trigger registries both contain the configured midnight schedule. Available scheduled-invocation analytics did not establish recent execution coverage; check deployed logs and queue progress rather than assuming the registry proves execution.

## Sources

- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/): Free CPU and subrequest allowances.
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/): Free query and bound-parameter allowances.
- [R2 bucket methods](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#bucket-method-definitions): `delete` accepts up to 1,000 keys and resolves after the objects have been deleted.
