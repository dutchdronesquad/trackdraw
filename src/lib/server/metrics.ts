import "server-only";

import {
  addUtcDays,
  addUtcMonths,
  addUtcWeeks,
  buildCumulativeGrowth,
  formatGrowthLabel,
  formatPeriodKey,
  formatUtcDateKey,
  getCustomGrowthBucket,
  getCustomGrowthBucketStarts,
  parseUtcDateKey,
  startOfUtcDay,
  startOfUtcMonth,
  startOfUtcWeek,
  type GrowthBucket,
  type GrowthCustomRange,
  type GrowthDailyPoint,
  type GrowthData,
  type GrowthPresetRange,
  type GrowthRange,
  type GrowthTimeline,
} from "@/lib/metrics-growth";
import { getDatabase } from "@/lib/server/db";

export type {
  GrowthBucket,
  GrowthCustomRange,
  GrowthDailyPoint,
  GrowthData,
  GrowthPoint,
  GrowthPresetRange,
  GrowthRange,
  GrowthTimeline,
} from "@/lib/metrics-growth";

export type UserMetrics = {
  total: number;
  newThisWeek: number;
  newThisMonth: number;
  neverCreatedProject: number;
  activeLastThirtyDays: number;
};

export type ProjectMetrics = {
  total: number;
  active: number;
  archived: number;
  avgPerUser: number;
  maxPerUser: number;
};

export type ShareMetrics = {
  totalActive: number;
  revoked: number;
  avgPerUser: number;
  maxPerUser: number;
};

export type PresetMetrics = {
  total: number;
  avgPerUser: number;
  maxPerUser: number;
};

export type GalleryMetrics = {
  total: number;
  listed: number;
  featured: number;
  hidden: number;
};

export type PlanLimitRow = {
  limit: number;
  usersExceedingProjects: number;
  usersExceedingShares: number;
  usersExceedingPresets: number;
  usersExceedingAny: number;
};

export type GrowthByRange = Record<GrowthPresetRange, GrowthData> &
  Partial<Record<"custom", GrowthData>>;

export type ApiKeyMetrics = {
  active: number;
  total: number;
};

export type AdminMetrics = {
  users: UserMetrics;
  projects: ProjectMetrics;
  shares: ShareMetrics;
  presets: PresetMetrics;
  gallery: GalleryMetrics;
  apiKeys: ApiKeyMetrics;
  userDistribution: [number, number, number][]; // [projects, shares, presets] per user
};

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const db = await getDatabase();

  const [
    userRow,
    neverCreatedRow,
    activeUsersRow,
    projectTotalsRow,
    projectPerUserRow,
    shareTotalsRow,
    sharePerUserRow,
    presetTotalsRow,
    presetPerUserRow,
    galleryRow,
    apiKeyRow,
    userDistributionResult,
  ] = await Promise.all([
    db
      .prepare(
        `
        select
          count(*) as total,
          sum(case when createdAt > datetime('now', '-7 days') then 1 else 0 end) as new_this_week,
          sum(case when createdAt >= date('now', 'start of month') then 1 else 0 end) as new_this_month
        from users
      `
      )
      .first<{
        total: number;
        new_this_week: number;
        new_this_month: number;
      }>(),

    db
      .prepare(
        `
        select count(*) as count
        from users u
        where not exists (select 1 from projects p where p.owner_user_id = u.id)
      `
      )
      .first<{ count: number }>(),

    db
      .prepare(
        `
        select count(distinct owner_user_id) as count
        from projects
        where updated_at > datetime('now', '-30 days')
      `
      )
      .first<{ count: number }>(),

    db
      .prepare(
        `
        select
          count(*) as total,
          sum(case when archived_at is null then 1 else 0 end) as active,
          sum(case when archived_at is not null then 1 else 0 end) as archived
        from projects
      `
      )
      .first<{ total: number; active: number; archived: number }>(),

    db
      .prepare(
        `
        select
          round(avg(cast(cnt as real)), 1) as avg_per_user,
          max(cnt) as max_per_user
        from (
          select owner_user_id, count(*) as cnt
          from projects
          where archived_at is null
          group by owner_user_id
        )
      `
      )
      .first<{ avg_per_user: number | null; max_per_user: number | null }>(),

    db
      .prepare(
        `
        select
          sum(case when revoked_at is null and (expires_at is null or expires_at > datetime('now')) then 1 else 0 end) as total_active,
          sum(case when revoked_at is not null then 1 else 0 end) as revoked
        from shares
        where owner_user_id is not null
      `
      )
      .first<{ total_active: number; revoked: number }>(),

    db
      .prepare(
        `
        select
          round(avg(cast(cnt as real)), 1) as avg_per_user,
          max(cnt) as max_per_user
        from (
          select owner_user_id, count(*) as cnt
          from shares
          where revoked_at is null and (expires_at is null or expires_at > datetime('now')) and owner_user_id is not null
          group by owner_user_id
        )
      `
      )
      .first<{ avg_per_user: number | null; max_per_user: number | null }>(),

    db
      .prepare(`select count(*) as total from layout_presets`)
      .first<{ total: number }>(),

    db
      .prepare(
        `
        select
          round(avg(cast(cnt as real)), 1) as avg_per_user,
          max(cnt) as max_per_user
        from (
          select owner_user_id, count(*) as cnt
          from layout_presets
          group by owner_user_id
        )
      `
      )
      .first<{ avg_per_user: number | null; max_per_user: number | null }>(),

    db
      .prepare(
        `
        select
          count(*) as total,
          sum(case when gallery_state = 'listed' then 1 else 0 end) as listed,
          sum(case when gallery_state = 'featured' then 1 else 0 end) as featured,
          sum(case when gallery_state = 'hidden' then 1 else 0 end) as hidden
        from gallery_entries
      `
      )
      .first<{
        total: number;
        listed: number;
        featured: number;
        hidden: number;
      }>(),

    db
      .prepare(
        `
        select
          count(*) as total,
          sum(case when enabled = 1 and (expiresAt is null or datetime(expiresAt) > datetime('now')) then 1 else 0 end) as active
        from apikey
      `
      )
      .first<{ total: number; active: number }>(),

    db
      .prepare(
        `
        select
          coalesce(p.cnt, 0) as proj_cnt,
          coalesce(s.cnt, 0) as share_cnt,
          coalesce(pr.cnt, 0) as preset_cnt
        from users u
        left join (
          select owner_user_id, count(*) as cnt
          from projects where archived_at is null
          group by owner_user_id
        ) p on p.owner_user_id = u.id
        left join (
          select owner_user_id, count(*) as cnt
          from shares
          where revoked_at is null and (expires_at is null or expires_at > datetime('now')) and owner_user_id is not null
          group by owner_user_id
        ) s on s.owner_user_id = u.id
        left join (
          select owner_user_id, count(*) as cnt
          from layout_presets
          group by owner_user_id
        ) pr on pr.owner_user_id = u.id
        `
      )
      .all<{ proj_cnt: number; share_cnt: number; preset_cnt: number }>(),
  ]);

  return {
    users: {
      total: userRow?.total ?? 0,
      newThisWeek: userRow?.new_this_week ?? 0,
      newThisMonth: userRow?.new_this_month ?? 0,
      neverCreatedProject: neverCreatedRow?.count ?? 0,
      activeLastThirtyDays: activeUsersRow?.count ?? 0,
    },
    projects: {
      total: projectTotalsRow?.total ?? 0,
      active: projectTotalsRow?.active ?? 0,
      archived: projectTotalsRow?.archived ?? 0,
      avgPerUser: projectPerUserRow?.avg_per_user ?? 0,
      maxPerUser: projectPerUserRow?.max_per_user ?? 0,
    },
    shares: {
      totalActive: shareTotalsRow?.total_active ?? 0,
      revoked: shareTotalsRow?.revoked ?? 0,
      avgPerUser: sharePerUserRow?.avg_per_user ?? 0,
      maxPerUser: sharePerUserRow?.max_per_user ?? 0,
    },
    presets: {
      total: presetTotalsRow?.total ?? 0,
      avgPerUser: presetPerUserRow?.avg_per_user ?? 0,
      maxPerUser: presetPerUserRow?.max_per_user ?? 0,
    },
    gallery: {
      total: galleryRow?.total ?? 0,
      listed: galleryRow?.listed ?? 0,
      featured: galleryRow?.featured ?? 0,
      hidden: galleryRow?.hidden ?? 0,
    },
    apiKeys: {
      active: apiKeyRow?.active ?? 0,
      total: apiKeyRow?.total ?? 0,
    },
    userDistribution: userDistributionResult.results.map((row) => [
      row.proj_cnt,
      row.share_cnt,
      row.preset_cnt,
    ]),
  };
}

export type RecentUser = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
};

export type OverviewStats = {
  totalUsers: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  activeProjects: number;
  newActiveProjectsThisMonth: number;
  newActiveProjectsLastMonth: number;
  activeShares: number;
  newActiveSharesThisMonth: number;
  newActiveSharesLastMonth: number;
  recentUsers: RecentUser[];
};

export async function getOverviewStats(): Promise<OverviewStats> {
  const db = await getDatabase();
  const [usersRow, projectsRow, sharesRow, recentUsersRows] = await Promise.all(
    [
      db
        .prepare(
          `select
            count(*) as total,
            sum(case when createdAt >= date('now', 'start of month') then 1 else 0 end) as new_this_month,
            sum(case when createdAt >= date('now', 'start of month', '-1 month') and createdAt < date('now', 'start of month') then 1 else 0 end) as new_last_month
           from users`
        )
        .first<{
          total: number;
          new_this_month: number;
          new_last_month: number;
        }>(),
      db
        .prepare(
          `select
            count(*) as count,
            coalesce(sum(case when created_at >= date('now', 'start of month') then 1 else 0 end), 0) as new_this_month,
            coalesce(sum(case when created_at >= date('now', 'start of month', '-1 month') and created_at < date('now', 'start of month') then 1 else 0 end), 0) as new_last_month
           from projects
           where archived_at is null`
        )
        .first<{
          count: number;
          new_this_month: number;
          new_last_month: number;
        }>(),
      db
        .prepare(
          `select
            count(*) as count,
            coalesce(sum(case when created_at >= date('now', 'start of month') then 1 else 0 end), 0) as new_this_month,
            coalesce(sum(case when created_at >= date('now', 'start of month', '-1 month') and created_at < date('now', 'start of month') then 1 else 0 end), 0) as new_last_month
           from shares
           where revoked_at is null
             and (expires_at is null or expires_at > datetime('now'))
             and owner_user_id is not null`
        )
        .first<{
          count: number;
          new_this_month: number;
          new_last_month: number;
        }>(),
      db
        .prepare(
          `select id, name, email, createdAt from users order by createdAt desc limit 6`
        )
        .all<{
          id: string;
          name: string | null;
          email: string | null;
          createdAt: string;
        }>(),
    ]
  );
  return {
    totalUsers: usersRow?.total ?? 0,
    newUsersThisMonth: usersRow?.new_this_month ?? 0,
    newUsersLastMonth: usersRow?.new_last_month ?? 0,
    activeProjects: projectsRow?.count ?? 0,
    newActiveProjectsThisMonth: projectsRow?.new_this_month ?? 0,
    newActiveProjectsLastMonth: projectsRow?.new_last_month ?? 0,
    activeShares: sharesRow?.count ?? 0,
    newActiveSharesThisMonth: sharesRow?.new_this_month ?? 0,
    newActiveSharesLastMonth: sharesRow?.new_last_month ?? 0,
    recentUsers: recentUsersRows?.results ?? [],
  };
}

export async function getGrowthByRange(options?: {
  customRange?: GrowthCustomRange | null;
}): Promise<GrowthByRange> {
  const db = await getDatabase();
  const rangeSpecs = getGrowthRangeSpecs(new Date());
  const customSpec = options?.customRange
    ? getCustomGrowthRangeSpec(options.customRange)
    : null;
  const specs = customSpec ? [...rangeSpecs, customSpec] : rangeSpecs;

  const pairs = await Promise.all(
    specs.map(async ({ range, bucket, bucketStarts, from, toExclusive }) => {
      const periodExpression =
        bucket === "month"
          ? "date(createdAt, 'start of month')"
          : bucket === "week"
            ? "date(createdAt, printf('-%d days', (cast(strftime('%w', createdAt) as integer) + 6) % 7))"
            : "date(createdAt)";
      const [growthResult, priorRow] = await Promise.all([
        db
          .prepare(
            `select ${periodExpression} as period, count(*) as users
             from users where createdAt >= ? and createdAt < ? group by period order by period`
          )
          .bind(from.toISOString(), toExclusive.toISOString())
          .all<{ period: string; users: number }>(),
        db
          .prepare(`select count(*) as count from users where createdAt < ?`)
          .bind(from.toISOString())
          .first<{ count: number }>(),
      ]);
      const countsByPeriod = new Map(
        growthResult.results.map((row) => [row.period, row.users])
      );
      const growthRows = bucketStarts.map((start) => {
        const period = formatPeriodKey(start, bucket);
        return {
          period,
          label: formatGrowthLabel(start, bucket),
          users: countsByPeriod.get(period) ?? 0,
        };
      });

      return [
        range,
        {
          bucket,
          from: formatUtcDateKey(from),
          to: formatUtcDateKey(addUtcDays(toExclusive, -1)),
          userGrowth: growthRows,
          userGrowthCumulative: buildCumulativeGrowth(
            growthRows,
            priorRow?.count ?? 0
          ),
        },
      ] as [GrowthRange, GrowthData];
    })
  );

  return Object.fromEntries(pairs) as GrowthByRange;
}

export async function getGrowthTimeline(): Promise<GrowthTimeline> {
  const db = await getDatabase();
  const [growthResult, totalRow] = await Promise.all([
    db
      .prepare(
        `select date(createdAt) as date, count(*) as users
         from users group by date order by date`
      )
      .all<GrowthDailyPoint>(),
    db
      .prepare(`select count(*) as count from users`)
      .first<{ count: number }>(),
  ]);

  return {
    dailyGrowth: growthResult.results,
    totalUsers: totalRow?.count ?? 0,
    today: formatUtcDateKey(startOfUtcDay(new Date())),
  };
}

type GrowthRangeSpec = {
  range: GrowthRange;
  bucket: GrowthBucket;
  bucketStarts: Date[];
  from: Date;
  toExclusive: Date;
};

function getGrowthRangeSpecs(now: Date): GrowthRangeSpec[] {
  const rollingThreeMonths = getRollingGrowthBucketStarts(now, "week", 13);
  const rollingSixMonths = getRollingGrowthBucketStarts(now, "week", 26);
  const rollingTwelveMonths = getRollingGrowthBucketStarts(now, "month", 12);
  const yearToDate = getYearToDateBucketStarts(now);
  const previousYear = getCalendarYearBucketStarts(now.getUTCFullYear() - 1);

  return [
    buildGrowthRangeSpec("3m", "week", rollingThreeMonths),
    buildGrowthRangeSpec("6m", "week", rollingSixMonths),
    buildGrowthRangeSpec("12m", "month", rollingTwelveMonths),
    buildGrowthRangeSpec("ytd", "month", yearToDate),
    buildGrowthRangeSpec("previousYear", "month", previousYear),
  ];
}

function buildGrowthRangeSpec(
  range: GrowthRange,
  bucket: GrowthBucket,
  bucketStarts: Date[]
): GrowthRangeSpec {
  const from = bucketStarts[0] ?? startOfUtcDay(new Date());
  const lastBucketStart = bucketStarts.at(-1) ?? from;
  const toExclusive =
    bucket === "month"
      ? addUtcMonths(lastBucketStart, 1)
      : bucket === "week"
        ? addUtcWeeks(lastBucketStart, 1)
        : addUtcDays(lastBucketStart, 1);
  return { range, bucket, bucketStarts, from, toExclusive };
}

function getCustomGrowthRangeSpec(range: GrowthCustomRange): GrowthRangeSpec {
  const from = parseUtcDateKey(range.from) ?? startOfUtcDay(new Date());
  const to = parseUtcDateKey(range.to) ?? from;
  const orderedFrom = from <= to ? from : to;
  const orderedTo = from <= to ? to : from;
  const bucket = getCustomGrowthBucket(orderedFrom, orderedTo);
  const bucketStarts = getCustomGrowthBucketStarts(
    orderedFrom,
    orderedTo,
    bucket
  );

  return {
    range: "custom",
    bucket,
    bucketStarts,
    from: orderedFrom,
    toExclusive: addUtcDays(orderedTo, 1),
  };
}

function getRollingGrowthBucketStarts(
  now: Date,
  bucket: GrowthBucket,
  count: number
): Date[] {
  const currentStart =
    bucket === "month" ? startOfUtcMonth(now) : startOfUtcWeek(now);
  return Array.from({ length: count }, (_, index) => {
    const offset = index - count + 1;
    return bucket === "month"
      ? addUtcMonths(currentStart, offset)
      : addUtcWeeks(currentStart, offset);
  });
}

function getYearToDateBucketStarts(now: Date): Date[] {
  const currentMonth = startOfUtcMonth(now);
  return Array.from(
    { length: currentMonth.getUTCMonth() + 1 },
    (_, month) => new Date(Date.UTC(currentMonth.getUTCFullYear(), month, 1))
  );
}

function getCalendarYearBucketStarts(year: number): Date[] {
  return Array.from(
    { length: 12 },
    (_, month) => new Date(Date.UTC(year, month, 1))
  );
}

export function normalizeGrowthCustomRange(
  fromValue: string | string[] | undefined,
  toValue: string | string[] | undefined
): GrowthCustomRange | null {
  const rawFrom = Array.isArray(fromValue) ? fromValue[0] : fromValue;
  const rawTo = Array.isArray(toValue) ? toValue[0] : toValue;
  if (!rawFrom || !rawTo) return null;

  const from = parseUtcDateKey(rawFrom);
  const to = parseUtcDateKey(rawTo);
  if (!from || !to) return null;

  const orderedFrom = from <= to ? from : to;
  const orderedTo = from <= to ? to : from;
  return {
    from: formatUtcDateKey(orderedFrom),
    to: formatUtcDateKey(orderedTo),
  };
}
