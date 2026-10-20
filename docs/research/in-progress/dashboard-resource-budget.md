# Dashboard resource budget

Measured October 20, 2026, following the [Workers Free investigation in PR #1008](https://github.com/dutchdronesquad/trackdraw/pull/1008).

## Remove work without a displayed result

The mounted metrics workspace uses the current growth/retention, activity, editor split, distribution and embed views. The old activation funnel, usage tabs and retention-cohort table remained exported through the chart loader, but no route rendered them. Their server fields still caused work whenever the dashboard or a selected reporting period loaded.

Remove those unused chart exports and their obsolete data contract. `getProductInsights` now performs eight SQL statements instead of fourteen: it no longer calculates the old account-activation funnel, all-event comparison counts, placement breakdown, import-size summary, API-key usage or retention-cohort table. Creator segment lookups used only by the removed editor panel are also gone. Export and share totals reuse the already-required format/surface counts. The current retention trend still uses the measured daily aggregates; this change does not remove that displayed metric, historical events or retention data.

## Controlled D1 measurement

Both versions ran their actual read-only SELECT queries against the production D1 database, for the same closed period July 1–October 19, 2026, with the calculation clock fixed at October 20, 15:00 UTC. Credentials and returned account/project/referrer details stayed in process memory. The probe recorded only aggregate resource metadata and a hash of all fields retained by the current workspace.

| Calculation              | SQL statements | D1 rows read | D1 rows written |
| ------------------------ | -------------: | -----------: | --------------: |
| Original                 |             14 |      108,302 |               0 |
| Without obsolete metrics |              8 |       77,158 |               0 |

Every retained output matched exactly: period, content growth, activity journeys/timing/reliability, reporting coverage, export/share quantities, editor split/funnel, surfaces and thresholded embed summaries. This probe removes 31,144 reads (28.8%) and six queries (42.9%) for that dataset and period. It is a controlled candidate-query measurement, not a measured reduction in deployed traffic or Worker CPU. Recheck [production D1 Insights](https://developers.cloudflare.com/d1/observability/metrics-analytics/#query-insights) after deployment.

An earlier trial forced `session_journeys AS MATERIALIZED` using SQLite's [materialization hint](https://www.sqlite.org/lang_with.html#materialization_hints). It returned identical aggregates but increased reads from 21,028 to 22,634 for the isolated session query. The hint was discarded. A shorter one-off SQL duration did not justify its additional reads.

## Regression boundaries

The actual-SQL period tests verify the eight-query budget and the anonymous/account funnels, export totals and current activity results. Existing coverage still checks UTC boundaries, retained-data coverage, export versions, embed thresholds and invalid ranges. Current dashboard interaction tests remain; tests solely for deleted, unmounted chart components were removed with those components. No persistent cache, index, migration, authorization change or target-catalog edit is introduced.

Validation: all 1,534 remaining tests pass, including the current workspace interaction tests; lint, type, formatting and the Next/OpenNext build pass. The handler is 2,034,273 B gzip, below the 2,252,800 B guard. An authenticated GET to `/dashboard/metrics` with a disposable local account passed in Cloudflare preview and delivered the reduced insights contract. The account was removed afterward. Production application code was not deployed.
