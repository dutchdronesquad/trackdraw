import "server-only";

import type {
  ProductActivityAnalysis,
  WeeklyProductActivity,
} from "@/lib/metrics-analysis";
import {
  addUtcDays,
  formatUtcDateKey,
  startOfUtcWeek,
} from "@/lib/metrics-growth";
import { productEventExportFormats } from "@/lib/product-events";
import { getDatabase } from "@/lib/server/db";

// Cohorts belong to their first recorded start inside the selected UTC period.
// Only ordered events in that same period and session contribute to progression.
const ACTIVITY_SQL = `
with events as (
  select created_at, event_type, session_id
  from product_events
  where contract_version in ('1.0.0', '1.1.0')
    and created_at >= ?1 and created_at < ?2 and created_at >= ?3
), starts as (
  select session_id, min(created_at) as started_at
  from events where event_type = 'editor.session_started' and session_id is not null
  group by session_id
), edits as (
  select s.session_id, s.started_at, min(e.created_at) as edited_at
  from starts s left join events e on e.session_id = s.session_id
    and e.event_type = 'editor.meaningful_edit_completed' and e.created_at > s.started_at
  group by s.session_id, s.started_at
), journeys as (
  select s.session_id, s.started_at, s.edited_at,
    date(s.started_at, printf('-%d days', (cast(strftime('%w', s.started_at) as integer) + 6) % 7)) as week,
    min(e.created_at) as first_result_at,
    min(case when e.created_at > s.edited_at then e.created_at end) as valuable_at
  from edits s left join events e on e.session_id = s.session_id
    and e.event_type in ('export.completed', 'share.created', 'publication.gallery_published')
    and e.created_at > s.started_at
  group by s.session_id, s.started_at, s.edited_at
), durations as (
  select week, max(0, round((julianday(first_result_at) - julianday(started_at)) * 86400)) as seconds
  from journeys where first_result_at is not null
), expanded_durations as (
  select week, seconds from durations
  union all select '*', seconds from durations
), ranked as (
  select week, seconds, row_number() over (partition by week order by seconds) as position,
    count(*) over (partition by week) as samples
  from expanded_durations
), timings as (
  select week,
    avg(case when position in ((samples + 1) / 2, (samples + 2) / 2) then seconds end) as median_seconds,
    max(case when position = (3 * samples + 3) / 4 then seconds end) as p75_seconds
  from ranked group by week
), cohorts as (
  select week, count(*) as started, count(edited_at) as edited,
    count(valuable_at) as valuable, count(first_result_at) as completed
  from journeys group by week
), event_weeks as (
  select date(created_at, printf('-%d days', (cast(strftime('%w', created_at) as integer) + 6) % 7)) as week,
    sum(case when event_type = 'export.completed' then 1 else 0 end) as exports,
    sum(case when event_type = 'share.viewed' then 1 else 0 end) as views
  from events group by week
)
select e.week, e.exports, e.views, coalesce(c.started, 0) as started, coalesce(c.edited, 0) as edited,
  coalesce(c.valuable, 0) as valuable, coalesce(c.completed, 0) as completed,
  t.median_seconds, t.p75_seconds
from event_weeks e left join cohorts c on c.week = e.week left join timings t on t.week = e.week
union all
select '*', 0, 0, count(*), count(edited_at), count(valuable_at), count(first_result_at),
  (select median_seconds from timings where week = '*'), (select p75_seconds from timings where week = '*')
from journeys
`;

type ActivityRow = {
  week: string;
  exports: number;
  views: number;
  started: number;
  edited: number;
  valuable: number;
  completed: number;
  median_seconds: number | null;
  p75_seconds: number | null;
};

export async function getProductActivityAnalysis(
  db: Awaited<ReturnType<typeof getDatabase>>,
  startAt: string,
  endAt: string,
  retainedAt: string
): Promise<ProductActivityAnalysis> {
  const [activity, exports] = await Promise.all([
    db
      .prepare(ACTIVITY_SQL)
      .bind(startAt, endAt, retainedAt)
      .all<ActivityRow>(),
    db
      .prepare(
        `
      select case when contract_version = '1.1.0' then coalesce(json_extract(metadata_json, '$.format'), 'unknown') else 'legacy' end as format,
        case when contract_version = '1.1.0' then 0 else 1 end as legacy,
        sum(case when event_type = 'export.completed' then 1 else 0 end) as successes,
        sum(case when event_type in ('export.failed', 'operation.failed') then 1 else 0 end) as failures
      from product_events
      where created_at >= ?1 and created_at < ?2 and created_at >= ?3
        and (
          (contract_version = '1.1.0' and event_type in ('export.completed', 'export.failed'))
          or (contract_version = '1.0.0' and (event_type = 'export.completed'
            or (event_type = 'operation.failed' and json_extract(metadata_json, '$.operation') = 'export')))
        )
      group by format, legacy order by failures desc, successes desc, format
    `
      )
      .bind(startAt, endAt, retainedAt)
      .all<{
        format: string;
        legacy: number;
        successes: number;
        failures: number;
      }>(),
  ]);
  const rows = new Map(activity.results.map((row) => [row.week, row]));
  const summary = rows.get("*");
  const weeks: WeeklyProductActivity[] = [];
  const effectiveStart = new Date(startAt > retainedAt ? startAt : retainedAt);
  const end = new Date(endAt);
  // Only retained weeks are materialized, even for an arbitrarily old selection.
  for (
    let week = startOfUtcWeek(effectiveStart);
    week < end && effectiveStart < end;
    week = addUtcDays(week, 7)
  ) {
    const key = formatUtcDateKey(week);
    const row = rows.get(key);
    weeks.push({
      week: key,
      from: formatUtcDateKey(
        new Date(Math.max(week.getTime(), effectiveStart.getTime()))
      ),
      to: formatUtcDateKey(
        addUtcDays(
          new Date(Math.min(addUtcDays(week, 7).getTime(), end.getTime())),
          -1
        )
      ),
      started: row?.started ?? 0,
      edited: row?.edited ?? 0,
      valuable: row?.valuable ?? 0,
      completed: row?.completed ?? 0,
      exports: row?.exports ?? 0,
      views: row?.views ?? 0,
      medianSeconds: row?.median_seconds ?? null,
      p75Seconds: row?.p75_seconds ?? null,
    });
  }
  return {
    weeks,
    journey: {
      started: summary?.started ?? 0,
      edited: summary?.edited ?? 0,
      valuable: summary?.valuable ?? 0,
      completed: summary?.completed ?? 0,
    },
    timeToResult: {
      samples: summary?.completed ?? 0,
      medianSeconds: summary?.median_seconds ?? null,
      p75Seconds: summary?.p75_seconds ?? null,
    },
    exportReliability: exports.results.map((row) => ({
      format: row.format,
      legacy: row.legacy === 1,
      successes: row.successes,
      failures: row.failures,
      failureRate:
        !row.legacy &&
        (productEventExportFormats as readonly string[]).includes(row.format) &&
        row.successes + row.failures > 0
          ? row.failures / (row.successes + row.failures)
          : null,
    })),
  };
}
