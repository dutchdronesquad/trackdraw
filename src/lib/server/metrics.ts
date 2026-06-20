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
};

export type GrowthPoint = {
  week: string;
  users: number;
};

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
  planLimits: PlanLimitRow[];
  userGrowth: GrowthPoint[];
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
    projectLimitsRow,
    shareLimitsRow,
    presetLimitsRow,
    userGrowthResult,
    apiKeyRow,
  ] = await Promise.all([
    db
      .prepare(
        `
        select
          count(*) as total,
          sum(case when createdAt > datetime('now', '-7 days') then 1 else 0 end) as new_this_week,
          sum(case when createdAt > datetime('now', '-30 days') then 1 else 0 end) as new_this_month
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
          sum(case when cnt > 3 then 1 else 0 end) as exceeds_3,
          sum(case when cnt > 5 then 1 else 0 end) as exceeds_5,
          sum(case when cnt > 10 then 1 else 0 end) as exceeds_10
        from (
          select owner_user_id, count(*) as cnt
          from projects
          where archived_at is null
          group by owner_user_id
        )
      `
      )
      .first<{ exceeds_3: number; exceeds_5: number; exceeds_10: number }>(),

    db
      .prepare(
        `
        select
          sum(case when cnt > 3 then 1 else 0 end) as exceeds_3,
          sum(case when cnt > 5 then 1 else 0 end) as exceeds_5,
          sum(case when cnt > 10 then 1 else 0 end) as exceeds_10
        from (
          select owner_user_id, count(*) as cnt
          from shares
          where revoked_at is null and (expires_at is null or expires_at > datetime('now')) and owner_user_id is not null
          group by owner_user_id
        )
      `
      )
      .first<{ exceeds_3: number; exceeds_5: number; exceeds_10: number }>(),

    db
      .prepare(
        `
        select
          sum(case when cnt > 3 then 1 else 0 end) as exceeds_3,
          sum(case when cnt > 5 then 1 else 0 end) as exceeds_5,
          sum(case when cnt > 10 then 1 else 0 end) as exceeds_10
        from (
          select owner_user_id, count(*) as cnt
          from layout_presets
          group by owner_user_id
        )
      `
      )
      .first<{ exceeds_3: number; exceeds_5: number; exceeds_10: number }>(),

    db
      .prepare(
        `
        select
          strftime('%Y-%W', createdAt) as week,
          count(*) as users
        from users
        where createdAt > datetime('now', '-84 days')
        group by week
        order by week
      `
      )
      .all<{ week: string; users: number }>(),

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
    planLimits: [
      {
        limit: 3,
        usersExceedingProjects: projectLimitsRow?.exceeds_3 ?? 0,
        usersExceedingShares: shareLimitsRow?.exceeds_3 ?? 0,
        usersExceedingPresets: presetLimitsRow?.exceeds_3 ?? 0,
      },
      {
        limit: 5,
        usersExceedingProjects: projectLimitsRow?.exceeds_5 ?? 0,
        usersExceedingShares: shareLimitsRow?.exceeds_5 ?? 0,
        usersExceedingPresets: presetLimitsRow?.exceeds_5 ?? 0,
      },
      {
        limit: 10,
        usersExceedingProjects: projectLimitsRow?.exceeds_10 ?? 0,
        usersExceedingShares: shareLimitsRow?.exceeds_10 ?? 0,
        usersExceedingPresets: presetLimitsRow?.exceeds_10 ?? 0,
      },
    ],
    userGrowth: userGrowthResult.results.map((row) => ({
      week: formatWeekLabel(row.week),
      users: row.users,
    })),
  };
}

function formatWeekLabel(yearWeek: string): string {
  const [year, week] = yearWeek.split("-");
  const yearNum = parseInt(year ?? "2024", 10);
  const weekNum = parseInt(week ?? "1", 10);
  const date = new Date(yearNum, 0, 1 + (weekNum - 1) * 7);
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}
