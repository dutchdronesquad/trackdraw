import "server-only";

import { getDatabase } from "@/lib/server/db";

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

export type GrowthPoint = {
  week: string;
  users: number;
};

export type GrowthRange = "3m" | "6m" | "1y";

export type GrowthData = {
  userGrowth: GrowthPoint[];
  userGrowthCumulative: GrowthPoint[];
};

export type GrowthByRange = Record<GrowthRange, GrowthData>;

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

function buildCumulativeGrowth(
  weeklyRows: { week: string; users: number }[],
  priorCount: number
): GrowthPoint[] {
  let running = priorCount;
  return weeklyRows.map((row) => {
    running += row.users;
    return { week: formatWeekLabel(row.week), users: running };
  });
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
  activeShares: number;
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
          `select count(*) as count from projects where archived_at is null`
        )
        .first<{ count: number }>(),
      db
        .prepare(
          `select count(*) as count from shares
           where revoked_at is null
             and (expires_at is null or expires_at > datetime('now'))
             and owner_user_id is not null`
        )
        .first<{ count: number }>(),
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
    activeShares: sharesRow?.count ?? 0,
    recentUsers: recentUsersRows?.results ?? [],
  };
}

export async function getGrowthByRange(): Promise<GrowthByRange> {
  const db = await getDatabase();
  const ranges: [GrowthRange, number][] = [
    ["3m", 91],
    ["6m", 182],
    ["1y", 365],
  ];

  const pairs = await Promise.all(
    ranges.map(async ([range, days]) => {
      const cutoff = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000
      ).toISOString();
      const [growthResult, priorRow] = await Promise.all([
        db
          .prepare(
            `select strftime('%Y-%W', createdAt) as week, count(*) as users
             from users where createdAt > ? group by week order by week`
          )
          .bind(cutoff)
          .all<{ week: string; users: number }>(),
        db
          .prepare(`select count(*) as count from users where createdAt < ?`)
          .bind(cutoff)
          .first<{ count: number }>(),
      ]);
      const weeklyRows = growthResult.results;
      return [
        range,
        {
          userGrowth: weeklyRows.map((row) => ({
            week: formatWeekLabel(row.week),
            users: row.users,
          })),
          userGrowthCumulative: buildCumulativeGrowth(
            weeklyRows,
            priorRow?.count ?? 0
          ),
        },
      ] as [GrowthRange, GrowthData];
    })
  );

  return Object.fromEntries(pairs) as GrowthByRange;
}

function formatWeekLabel(yearWeek: string): string {
  const [year, week] = yearWeek.split("-");
  const yearNum = parseInt(year ?? "2024", 10);
  const weekNum = parseInt(week ?? "1", 10);
  const date = new Date(yearNum, 0, 1 + (weekNum - 1) * 7);
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}
