import "server-only";
import { getDatabase } from "@/lib/server/db";
import type { ProductMetricDatabase } from "@/lib/server/product-metric-aggregates";
import {
  getYearInNumbers,
  type YearNumberDailyTotal,
} from "@/lib/year-in-numbers";

/** Finalize complete UTC days once. Later opt-outs/deletions must not rewrite anonymous history. */
export async function aggregateYearNumbers(
  db: ProductMetricDatabase,
  now = new Date()
) {
  const today = now.toISOString().slice(0, 10);
  // The oldest retention day may already have lost part of its events.
  const retainedFrom = new Date(Date.parse(today) - 179 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  await db
    .prepare(
      `
    WITH RECURSIVE
    bounds AS (
      SELECT max(?, min(measured_since)) AS start_day, ? AS end_day
      FROM product_metric_measurement_state
      WHERE contract_version = '1.1.0' AND metric_id = 'MTR-001'
    ),
    days(day) AS (
      SELECT start_day FROM bounds WHERE start_day < end_day
      UNION ALL SELECT date(day, '+1 day') FROM days, bounds WHERE date(day, '+1 day') < end_day
    ),
    missing_days AS (
      SELECT day FROM days WHERE NOT EXISTS (
        SELECT 1 FROM year_number_daily_totals WHERE day_utc = day AND metric = 'elements'
      )
    ),
    events AS (
      SELECT d.day, e.id, e.created_at, e.session_id, e.event_type, e.metadata_json,
        CASE WHEN e.user_id IS NOT NULL THEN 'user:' || e.user_id
          WHEN e.session_id IS NOT NULL THEN 'session:' || e.session_id END AS actor
      FROM missing_days d JOIN product_events e
        ON e.created_at >= d.day || 'T00:00:00.000Z'
        AND e.created_at < date(d.day, '+1 day') || 'T00:00:00.000Z'
        AND e.contract_version IN ('1.0.0', '1.1.0')
    ),
    actions AS (
      SELECT day, 'elements' AS metric, json_extract(metadata_json, '$.count') AS amount, actor
      FROM events WHERE event_type = 'editor.element_placed'
      UNION ALL SELECT day, 'sessions', 1, actor FROM events e
      WHERE e.event_type = 'acquisition.session_attributed' AND e.session_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM product_events previous
          WHERE previous.event_type = 'acquisition.session_attributed'
            AND previous.contract_version IN ('1.0.0', '1.1.0')
            AND previous.session_id = e.session_id
            AND (previous.created_at < e.created_at OR (previous.created_at = e.created_at AND previous.id < e.id))
        )
        AND EXISTS (
          SELECT 1 FROM product_events edit
          WHERE edit.event_type = 'editor.meaningful_edit_completed'
            AND edit.contract_version IN ('1.0.0', '1.1.0')
            AND edit.session_id = e.session_id AND edit.created_at < ? || 'T00:00:00.000Z'
        )
      UNION ALL SELECT day, 'exports', 1, actor FROM events WHERE event_type = 'export.completed'
      UNION ALL SELECT day, 'shares', 1, actor FROM events WHERE event_type = 'share.created'
      UNION ALL SELECT day, 'views', 1, actor FROM events WHERE event_type = 'share.viewed'
    ),
    metrics(metric) AS (VALUES ('elements'), ('exports'), ('sessions'), ('shares'), ('views'))
    INSERT INTO year_number_daily_totals (day_utc, metric, total, contributors, source, updated_at)
    SELECT d.day, m.metric, coalesce(sum(a.amount), 0), min(5, count(DISTINCT a.actor)), 'product-events-v1', ?
    FROM missing_days d CROSS JOIN metrics m
    LEFT JOIN actions a ON a.day = d.day AND a.metric = m.metric
    GROUP BY d.day, m.metric
    ON CONFLICT(day_utc, metric) DO NOTHING
  `
    )
    .bind(retainedFrom, today, today, now.toISOString())
    .run();

  // The deployment day has only partial trigger coverage. Never infer historical registrations.
  await db
    .prepare(
      `
    WITH RECURSIVE days(day) AS (
      SELECT max(date(started_at, '+1 day'), date(?, '-24 months')) FROM year_number_collection
      WHERE date(started_at, '+1 day') < ?
      UNION ALL SELECT date(day, '+1 day') FROM days WHERE date(day, '+1 day') < ?
    )
    INSERT INTO year_number_daily_totals (day_utc, metric, total, contributors, source, updated_at)
    SELECT day, 'accounts', 0, 0, 'registration-trigger', ? FROM days WHERE true
    ON CONFLICT(day_utc, metric) DO NOTHING
  `
    )
    .bind(today, today, today, now.toISOString())
    .run();
  await db
    .prepare(
      `DELETE FROM year_number_daily_totals WHERE day_utc < date(?, '-24 months')`
    )
    .bind(today)
    .run();
}

export async function loadYearInNumbers(year: number, now = new Date()) {
  // Validate before querying. This read never changes aggregates.
  getYearInNumbers(year, [], now);
  const db = await getDatabase();
  const { results } = await db
    .prepare(
      `
    SELECT day_utc, metric, total, contributors, source, updated_at FROM year_number_daily_totals
    WHERE day_utc >= ? AND day_utc < ?
      AND (metric <> 'accounts' OR day_utc > (SELECT date(started_at) FROM year_number_collection))
    ORDER BY day_utc, metric
  `
    )
    .bind(`${year}-01-01`, `${year + 1}-01-01`)
    .all<YearNumberDailyTotal>();
  return getYearInNumbers(year, results, now);
}
