const CONTRACT_VERSION = "1.1.0";
const AGGREGATE_RETENTION_MONTHS = 24;
const MAX_BACKFILL_DAYS_PER_RUN = 7;

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run<T = unknown>(): Promise<T>;
};

export type ProductMetricDatabase = {
  prepare(query: string): D1PreparedStatement;
};

export type ProductMetricId =
  | "MTR-001"
  | "MTR-002"
  | "MTR-003"
  | "MTR-004"
  | "MTR-005"
  | "MTR-006"
  | "MTR-007"
  | "MTR-008"
  | "MTR-009"
  | "MTR-010";

export type ProductMetricDailyRow = {
  metric_id: ProductMetricId;
  day_utc: string;
  dimension: string;
  window_days: 7 | 28 | 30;
  numerator: number;
  denominator: number | null;
  sample_size: number | null;
  completeness_state: "complete" | "incomplete";
  quality_status:
    "building" | "low_volume" | "healthy" | "degraded" | "invalid";
  updated_at: string;
};

export type ProductMetricMeasurementState = {
  metric_id: ProductMetricId;
  contract_version: string;
  measured_since: string;
  completeness_state:
    "not_started" | "building" | "incomplete" | "complete" | "invalid";
  last_aggregated_day: string | null;
  last_success_at: string | null;
};

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDay(date);
}

function daysBetween(from: string, toExclusive: string) {
  return Math.max(
    0,
    Math.round(
      (Date.parse(`${toExclusive}T00:00:00.000Z`) -
        Date.parse(`${from}T00:00:00.000Z`)) /
        86_400_000
    )
  );
}

const DAILY_METRIC_CTES = `
with
  bounds as (
    select ? as day_utc, ? as start_at, ? as end_at, ? as updated_at, ? as is_complete_day
  ),
  events28 as (
    select *
    from product_events, bounds
    where contract_version in ('1.0.0', '${CONTRACT_VERSION}')
      and created_at >= datetime(bounds.start_at, '-27 days')
      and created_at < bounds.end_at
  ),
  events7 as (
    select events28.* from events28, bounds
    where created_at >= datetime(bounds.start_at, '-6 days')
  ),
  editor_actors7 as (
    select distinct
      case
        when user_id is not null then 'user:' || user_id
        when session_id is not null then 'session:' || session_id
      end as actor
    from events7
    where event_type = 'editor.session_started'
  ),
  active_actors7 as (
    select distinct
      case
        when user_id is not null then 'user:' || user_id
        when session_id is not null then 'session:' || session_id
      end as actor
    from events7
    where event_type = 'editor.meaningful_edit_completed'
  ),
  editor_sessions7 as (
    select distinct session_id
    from events7
    where event_type = 'editor.session_started' and session_id is not null
  ),
  session_journeys7 as (
    select
      session_id,
      min(case when event_type = 'editor.meaningful_edit_completed' then created_at end) as first_edit_at,
      max(case when event_type in ('export.completed', 'share.created', 'publication.gallery_published') then created_at end) as last_outcome_at,
      max(case when event_type = 'share.created' and json_extract(metadata_json, '$.share_type') = 'published' then created_at
               when event_type = 'publication.gallery_published' then created_at end) as last_publication_at
    from events7
    where session_id is not null
    group by session_id
  ),
  valuable_sessions7 as (
    select session_id, last_publication_at
    from session_journeys7
    where first_edit_at is not null and last_outcome_at > first_edit_at
  ),
  editor_sessions28 as (
    select
      session_id,
      max(case when user_id is not null then 1 else 0 end) as signed_in
    from events28
    where event_type = 'editor.session_started' and session_id is not null
    group by session_id
  ),
  session_journeys28 as (
    select
      session_id,
      min(case when event_type = 'editor.meaningful_edit_completed' then created_at end) as first_edit_at,
      max(case when event_type in ('export.completed', 'share.created', 'publication.gallery_published') then created_at end) as last_outcome_at,
      max(case when event_type = 'share.created' and json_extract(metadata_json, '$.share_type') = 'published' then created_at
               when event_type = 'publication.gallery_published' then created_at end) as last_publication_at
    from events28
    where session_id is not null
    group by session_id
  ),
  valuable_sessions28 as (
    select session_id, last_publication_at
    from session_journeys28
    where first_edit_at is not null and last_outcome_at > first_edit_at
  ),
  acquisition_sources(source) as (
    values ('direct'), ('search'), ('social'), ('community'), ('referral'), ('campaign'), ('unknown')
  ),
  feature_events(feature, event_type) as (
    values
      ('preview_3d', 'editor.3d_opened'),
      ('import', 'project.imported'),
      ('export', 'export.completed'),
      ('share_link', 'share.created'),
      ('gallery_publication', 'publication.gallery_published')
  ),
  feature_rows as (
    select
      feature_events.feature as dimension,
      count(distinct case
        when feature_event.session_id is not null
          and (feature_events.feature <> 'gallery_publication' or editor_sessions28.signed_in = 1)
        then feature_event.session_id
      end) as numerator,
      count(distinct case
        when feature_events.feature <> 'gallery_publication' or editor_sessions28.signed_in = 1
        then editor_sessions28.session_id
      end) as denominator
    from feature_events
    left join editor_sessions28 on 1 = 1
    left join events28 feature_event
      on feature_event.event_type = feature_events.event_type
      and feature_event.session_id = editor_sessions28.session_id
    group by feature_events.feature
  ),
  failure_events as (
    select
      json_extract(metadata_json, '$.operation') || ':' || json_extract(metadata_json, '$.category') as dimension,
      json_extract(metadata_json, '$.operation') as operation,
      1 as numerator
    from events7
    where event_type = 'operation.failed'
    union all
    select
      'export:' || json_extract(metadata_json, '$.category') as dimension,
      'export' as operation,
      1 as numerator
    from events7
    where event_type = 'export.failed'
  ),
  failure_rows as (
    select dimension, operation, sum(numerator) as numerator
    from failure_events
    group by operation, dimension
  ),
  operation_outcomes as (
    select 'import' as operation, count(*) as successes from events7 where event_type = 'project.imported'
    union all select 'export', count(*) from events7 where event_type = 'export.completed'
    union all select 'share_create', count(*) from events7 where event_type = 'share.created'
    union all select 'gallery_publish', count(*) from events7 where event_type = 'publication.gallery_published'
    union all select 'share_view', count(*) from events7 where event_type = 'share.viewed'
  ),
  operation_failures as (
    select operation, sum(numerator) as failures
    from failure_rows
    group by operation
  ),
  -- D1 caps compound SELECTs at five terms, so keep metric unions bounded.
  metric_rows_primary(metric_id, dimension, window_days, numerator, denominator, quality_volume) as (
    select 'MTR-001', '', 7, (select count(actor) from active_actors7), null, (select count(actor) from editor_actors7)
    union all
    select 'MTR-002', '', 7, (select count(actor) from active_actors7), (select count(actor) from editor_actors7), (select count(actor) from editor_actors7)
    union all
    select 'MTR-003', '', 7, (select count(*) from valuable_sessions7), null, (select count(*) from editor_sessions7)
    union all
    select 'MTR-004', '', 7, (select count(*) from valuable_sessions7), (select count(*) from editor_sessions7), (select count(*) from editor_sessions7)
    union all
    select 'MTR-005', '', 30,
      case when datetime((select end_at from bounds), '+30 days') <= (select updated_at from bounds) then
        (select count(*)
         from product_metric_creator_activations activation, bounds
         where activation.activated_at >= bounds.start_at
           and activation.activated_at < bounds.end_at
           and exists (
             select 1 from product_events return_event
             where return_event.contract_version in ('1.0.0', '${CONTRACT_VERSION}')
               and return_event.user_id = activation.user_id
               and return_event.event_type = 'editor.session_started'
               and return_event.created_at >= datetime(activation.activated_at, '+1 day')
               and return_event.created_at < datetime(activation.activated_at, '+31 days')
               and return_event.session_id <> (
                 select first_edit.session_id from product_events first_edit
                 where first_edit.contract_version in ('1.0.0', '${CONTRACT_VERSION}')
                   and first_edit.user_id = activation.user_id
                   and first_edit.event_type = 'editor.meaningful_edit_completed'
                 order by first_edit.created_at limit 1
               )
           ))
        else 0
      end,
      case when datetime((select end_at from bounds), '+30 days') <= (select updated_at from bounds) then
        (select count(*) from product_metric_creator_activations a, bounds
         where a.activated_at >= bounds.start_at and a.activated_at < bounds.end_at)
      end,
      case when datetime((select end_at from bounds), '+30 days') <= (select updated_at from bounds) then
        (select count(*) from product_metric_creator_activations a, bounds
         where a.activated_at >= bounds.start_at and a.activated_at < bounds.end_at)
      end
  ),
  metric_rows_secondary(metric_id, dimension, window_days, numerator, denominator, quality_volume) as (
    select 'MTR-006', '', 7, count(distinct session_id), null, count(distinct session_id)
    from events7
    where event_type = 'share.viewed'
      and json_extract(metadata_json, '$.share_type') = 'published'
      and session_id is not null
    union all
    select 'MTR-007', '', 28,
      sum(case when last_publication_at is not null then 1 else 0 end),
      count(*),
      count(*)
    from valuable_sessions28
    union all
    select 'MTR-008', acquisition_sources.source, 28,
      count(events28.id),
      (select count(*) from events28 all_acquisition
       where all_acquisition.event_type = 'acquisition.session_attributed'
         and json_extract(all_acquisition.metadata_json, '$.source') <> 'internal'),
      (select count(*) from events28 all_acquisition
       where all_acquisition.event_type = 'acquisition.session_attributed'
         and json_extract(all_acquisition.metadata_json, '$.source') <> 'internal')
    from acquisition_sources
    left join events28 on events28.event_type = 'acquisition.session_attributed'
      and json_extract(events28.metadata_json, '$.source') = acquisition_sources.source
    group by acquisition_sources.source
    union all
    select 'MTR-009', dimension, 28, numerator, denominator, denominator from feature_rows
    union all
    select 'MTR-010', failure_rows.dimension, 7, failure_rows.numerator,
      case
        when failure_rows.operation in ('editor_load', 'project_save') then null
        else operation_failures.failures + coalesce(operation_outcomes.successes, 0)
      end,
      case
        when failure_rows.operation in ('editor_load', 'project_save') then failure_rows.numerator
        else operation_failures.failures + coalesce(operation_outcomes.successes, 0)
      end
    from failure_rows
    inner join operation_failures on operation_failures.operation = failure_rows.operation
    left join operation_outcomes on operation_outcomes.operation = failure_rows.operation
  ),
  metric_rows as (
    select * from metric_rows_primary
    union all
    select * from metric_rows_secondary
  ),
  final_rows as (
    select
      metric_rows.metric_id,
      bounds.day_utc,
      metric_rows.dimension,
      metric_rows.window_days,
      cast(coalesce(metric_rows.numerator, 0) as integer) as numerator,
      cast(metric_rows.denominator as integer) as denominator,
      cast(metric_rows.quality_volume as integer) as sample_size,
      case
        when bounds.is_complete_day = 0 then 'incomplete'
        when metric_rows.metric_id = 'MTR-005'
          and datetime(bounds.end_at, '+30 days') > bounds.updated_at then 'incomplete'
        else 'complete'
      end as completeness_state,
      case
        when bounds.is_complete_day = 0 then 'building'
        when metric_rows.metric_id = 'MTR-005'
          and datetime(bounds.end_at, '+30 days') > bounds.updated_at then 'building'
        when julianday(bounds.day_utc) - julianday(state.measured_since) < 28 then 'building'
        else 'healthy'
      end as quality_status,
      bounds.updated_at
    from metric_rows
    cross join bounds
    inner join product_metric_measurement_state state on state.metric_id = metric_rows.metric_id
    where bounds.day_utc >= state.measured_since
  )
`;

function bindDailyStatement(
  statement: D1PreparedStatement,
  day: string,
  endAt: string,
  updatedAt: string,
  isCompleteDay: boolean,
  ...values: unknown[]
) {
  return statement.bind(
    day,
    `${day}T00:00:00.000Z`,
    endAt,
    updatedAt,
    isCompleteDay ? 1 : 0,
    ...values
  );
}

async function refreshCreatorActivations(db: ProductMetricDatabase) {
  return db
    .prepare(
      `
      insert into product_metric_creator_activations (user_id, activated_at)
      select user_id, min(created_at)
      from product_events
      where contract_version in ('1.0.0', '1.1.0')
        and event_type = 'editor.meaningful_edit_completed'
        and user_id is not null
        and created_at >= (
          select min(measured_since) || 'T00:00:00.000Z'
          from product_metric_measurement_state
          where contract_version = ?
        )
      group by user_id
      on conflict(user_id) do update set activated_at = min(activated_at, excluded.activated_at)
    `
    )
    .bind(CONTRACT_VERSION)
    .run();
}

async function aggregateDay(
  db: ProductMetricDatabase,
  day: string,
  updatedAt: string
) {
  const statement = db.prepare(`
    ${DAILY_METRIC_CTES}
    insert into product_metric_daily_aggregates (
      metric_id, day_utc, dimension, window_days, numerator, denominator, sample_size,
      completeness_state, quality_status, updated_at
    )
    select * from final_rows where true
    on conflict(metric_id, day_utc, dimension) do update set
      numerator = excluded.numerator,
      denominator = excluded.denominator,
      sample_size = excluded.sample_size,
      completeness_state = excluded.completeness_state,
      quality_status = excluded.quality_status,
      updated_at = excluded.updated_at
  `);
  return bindDailyStatement(
    statement,
    day,
    `${addUtcDays(day, 1)}T00:00:00.000Z`,
    updatedAt,
    true
  ).run<{
    meta?: { changes?: number };
  }>();
}

async function cleanupExpiredAggregates(db: ProductMetricDatabase) {
  return db
    .prepare(
      `delete from product_metric_daily_aggregates
       where day_utc < date('now', '-${AGGREGATE_RETENTION_MONTHS} months')`
    )
    .run<{ meta?: { changes?: number } }>();
}

function changes(result: { meta?: { changes?: number } }) {
  return result.meta?.changes ?? 0;
}

export async function runProductMetricMaintenance(
  db: ProductMetricDatabase,
  now = new Date()
) {
  const updatedAt = now.toISOString();
  const today = utcDay(now);
  await refreshCreatorActivations(db);

  const state = await db
    .prepare(
      `select min(measured_since) as measured_since,
              min(last_aggregated_day) as last_aggregated_day
       from product_metric_measurement_state
       where contract_version = ? and completeness_state <> 'invalid'`
    )
    .bind(CONTRACT_VERSION)
    .first<{
      measured_since: string | null;
      last_aggregated_day: string | null;
    }>();

  const requestedStart = state?.last_aggregated_day
    ? addUtcDays(state.last_aggregated_day, 1)
    : state?.measured_since;
  const availableStart = addUtcDays(today, -180);
  const unrecoverableBackfillDays =
    requestedStart && requestedStart < availableStart
      ? daysBetween(requestedStart, availableStart)
      : 0;
  if (unrecoverableBackfillDays > 0) {
    await db
      .prepare(
        `update product_metric_measurement_state
         set completeness_state = 'invalid', updated_at = ?
         where contract_version = ?`
      )
      .bind(updatedAt, CONTRACT_VERSION)
      .run();
    const cleanupResult = await cleanupExpiredAggregates(db);
    return {
      meta: { changes: changes(cleanupResult) },
      health: {
        aggregated_days: 0,
        aggregate_rows: 0,
        last_aggregated_day: state?.last_aggregated_day ?? null,
        remaining_backfill_days: 0,
        unrecoverable_backfill_days: unrecoverableBackfillDays,
        deleted_rows: changes(cleanupResult),
      },
    };
  }
  const start = requestedStart
    ? requestedStart > availableStart
      ? requestedStart
      : availableStart
    : today;
  const dayCount = Math.min(
    daysBetween(start, today),
    MAX_BACKFILL_DAYS_PER_RUN
  );
  let aggregateRows = 0;
  let lastAggregatedDay: string | null = state?.last_aggregated_day ?? null;
  let aggregatedDays = 0;

  for (let offset = 0; offset < dayCount; offset += 1) {
    const day = addUtcDays(start, offset);
    aggregateRows += changes(await aggregateDay(db, day, updatedAt));
    lastAggregatedDay = day;
    aggregatedDays += 1;
  }

  // MTR-005 becomes factual only after its complete 30-day observation
  // window. Recompute that newly matured cohort while raw events still exist.
  const maturedCohortDay = addUtcDays(today, -31);
  if (
    aggregatedDays < MAX_BACKFILL_DAYS_PER_RUN &&
    state?.measured_since &&
    maturedCohortDay >= state.measured_since &&
    (maturedCohortDay < start ||
      maturedCohortDay >= addUtcDays(start, dayCount))
  ) {
    aggregateRows += changes(
      await aggregateDay(db, maturedCohortDay, updatedAt)
    );
    aggregatedDays += 1;
  }

  if (lastAggregatedDay) {
    await db
      .prepare(
        `update product_metric_measurement_state
         set last_aggregated_day = ?,
             last_success_at = ?,
             completeness_state = case
               when ? < ? then 'incomplete'
               when julianday(?) - julianday(measured_since) >= 28 then 'complete'
               else 'building'
             end,
             updated_at = ?
         where contract_version = ? and completeness_state <> 'invalid'`
      )
      .bind(
        lastAggregatedDay,
        updatedAt,
        lastAggregatedDay,
        addUtcDays(today, -1),
        addUtcDays(lastAggregatedDay, 1),
        updatedAt,
        CONTRACT_VERSION
      )
      .run();
  }

  const cleanupResult = await cleanupExpiredAggregates(db);
  return {
    meta: { changes: aggregateRows + changes(cleanupResult) },
    health: {
      aggregated_days: aggregatedDays,
      aggregate_rows: aggregateRows,
      last_aggregated_day: lastAggregatedDay,
      remaining_backfill_days: Math.max(
        0,
        daysBetween(addUtcDays(start, dayCount), today)
      ),
      unrecoverable_backfill_days: 0,
      deleted_rows: changes(cleanupResult),
    },
  };
}

export async function getProductMetricSeries(
  db: ProductMetricDatabase,
  metricId: ProductMetricId,
  fromDay: string,
  toDayExclusive: string,
  now = new Date()
) {
  const today = utcDay(now);
  const historicalEnd = toDayExclusive < today ? toDayExclusive : today;
  const historical = await db
    .prepare(
      `select metric_id, day_utc, dimension, window_days, numerator, denominator, sample_size,
              completeness_state, quality_status, updated_at
       from product_metric_daily_aggregates
       where metric_id = ? and day_utc >= ? and day_utc < ?
       order by day_utc, dimension`
    )
    .bind(metricId, fromDay, historicalEnd)
    .all<ProductMetricDailyRow>();

  if (fromDay > today || toDayExclusive <= today) {
    return historical.results;
  }

  const liveStatement = db.prepare(`
    ${DAILY_METRIC_CTES}
    select * from final_rows where metric_id = ? order by dimension
  `);
  const live = await bindDailyStatement(
    liveStatement,
    today,
    now.toISOString(),
    now.toISOString(),
    false,
    metricId
  ).all<ProductMetricDailyRow>();

  return [...historical.results, ...live.results];
}

export async function getProductMetricMeasurementStates(
  db: ProductMetricDatabase
) {
  const result = await db
    .prepare(
      `select metric_id, contract_version, measured_since, completeness_state,
              last_aggregated_day, last_success_at
       from product_metric_measurement_state
       where contract_version = ?
       order by metric_id`
    )
    .bind(CONTRACT_VERSION)
    .all<ProductMetricMeasurementState>();
  return result.results;
}
