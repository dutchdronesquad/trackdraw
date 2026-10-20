# Scheduled cleanup resource budget

The original daily cleanup shared one Workers Free invocation across eight owners. Independent batches could exceed both the D1 query and subrequest budgets. Reducing account work to two per day would create an unnecessarily slow backlog, so account deletion and warning delivery now have separate hourly invocations.

## Schedules and bounds

| UTC cron                     | Work                                                       | Per-run bound                       | Maximum daily throughput       |
| ---------------------------- | ---------------------------------------------------------- | ----------------------------------- | ------------------------------ |
| `0 0 * * *`                  | Six general retention owners, including metric aggregation | Seven complete metric backfill days | Once per day                   |
| `15,30 * * * *` at minute 15 | Eligible account deletion and durable media queue          | Ten accounts, 100 media keys        | 240 accounts, 2,400 media keys |
| `15,30 * * * *` at minute 30 | Account retention warnings                                 | Five candidates                     | 120 warnings                   |

The Worker selects tasks from the controller expression and scheduled UTC minute; unknown schedules fail closed. Delayed delivery uses scheduled time rather than the wall clock. Two cron expressions cover all three executions, using four triggers across development and production rather than six; check account-wide quota before deployment. These are ceilings, not delivery guarantees. Ineligible candidates and provider/database failures can reduce throughput. Remaining work stays durable for subsequent hours.

Media cleanup deletes up to 100 R2 keys in one bulk operation, then acknowledges exactly those keys in one D1 statement. A failed operation or ambiguous response retains the durable batch for idempotent retry; concurrently queued keys remain pending. The 100-key bound also respects D1's bound-parameter ceiling.

Admins are excluded from automatic warnings and account deletion; the current role is rechecked before sending and deleting, including promotion during processing. Hourly runs do not create extra warning stages: one first warning and one final warning are recorded per inactivity period. Durable acceptance markers, claims and stable provider idempotency keys protect repeated and concurrent runs.

Authoritative session/activity checks, acknowledged warning requirements, atomic deletion/audit and full response periods remain intact. Warning deadlines are rounded up to UTC midnight. Account cleanup cannot run before a stored deadline, twelve calendar months of inactivity or seven days after final acknowledgment. Existing deadlines containing a time of day are respected by the first eligible hourly run after that time.

## Evidence

The committed migrated-SQLite regression seeds 25 warning candidates, 25 distinct eligible removal candidates, 101 media keys and seven complete days of metric backfill. It runs each actual schedule separately with fake mail/R2 providers and verifies subsequent runs drain the backlog without duplicate warnings.

| Full per-schedule fixture    | SQL statements | Mail requests | R2 calls | Conservative combined operations |
| ---------------------------- | -------------: | ------------: | -------: | -------------------------------: |
| Daily general cleanup        |             24 |             0 |        0 |                               24 |
| Hourly account/media cleanup |             43 |             0 |        1 |                               44 |
| Hourly warnings              |             27 |             5 |        0 |                               32 |

Each SQL statement is counted individually, including those submitted in D1 batches. Each invocation stays below 50 SQL statements and below a conservative combined ceiling of 50 statements plus external calls. The original full shared fixture submitted 353 SQL statements, 25 mail requests and 100 R2 calls in one invocation. These figures compare bounded work per invocation, not equal total daily work.

The schedules produce 49 scheduled invocations per day, even without backlog. More frequent account candidate queries trade a small amount of idle work for timely backlog processing. General retention and metric scans remain daily. Inspect deployed CPU, D1 Insights, notice health and queue progress after deployment before increasing batch sizes further.

Focused lifecycle tests cover bulk failure/retry, acknowledgment failure, concurrent additions, reactivation, live sessions and full warning periods. An isolated local Cloudflare runtime exercised actual bulk cleanup against local D1/R2 bindings: 101 synthetic objects drained as 100 then one, followed by an empty idempotent retry. No remote binding or persistent application data was involved.

The actual custom Worker scheduled-handler dispatch was also checked using local Cloudflare scheduled events for all three executions, with an isolated empty database adapter and no external providers. Each completed successfully with the intended task group.

These are operation-count measurements, not hosted Worker CPU measurements or production savings. No live cleanup was triggered. Deploying the Wrangler configuration installs the two Cron triggers; configuration changes can take time to propagate. Registry configuration alone does not prove executions succeeded: check deployed logs and queue progress after deployment.

## Sources

- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/): Free CPU, subrequest and cron allowances.
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/): Free query and bound-parameter allowances.
- [Scheduled handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/): selecting work with `controller.cron`.
- [R2 bucket methods](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#bucket-method-definitions): bulk deletion and completion semantics.
