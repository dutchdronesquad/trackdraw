import "server-only";

import { cache } from "react";
import { parseAccountRole, type AccountRole } from "@/lib/account/roles";
import type { AdminUser } from "@/lib/account/admin-users";
import { getDatabase } from "@/lib/server/db";
import { deleteSharesOwnedByUser } from "@/lib/server/shares";

type UserRoleRow = {
  role: string | null;
};

type CountRow = {
  count: number;
};

export type UserContextStats = {
  projectCount: number;
  activeShareCount: number;
  galleryEntryCount: number;
  apiKeyCount: number;
};

type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  projectCount: number;
  bannedAt: string | null;
  banReason: string | null;
};

function mapAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    role: parseAccountRole(row.role),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt ?? null,
    projectCount: Number(row.projectCount ?? 0),
    bannedAt: row.bannedAt ?? null,
    banReason: row.banReason ?? null,
  };
}

export async function getUserRoleById(userId: string): Promise<AccountRole> {
  const db = await getDatabase();
  const row = await db
    .prepare(
      `
        select role
        from users
        where id = ?
        limit 1
      `
    )
    .bind(userId)
    .first<UserRoleRow>();

  return parseAccountRole(row?.role);
}

export async function listUsersForAdmin(): Promise<AdminUser[]> {
  const db = await getDatabase();
  const result = await db
    .prepare(
      `
        select
          u.id,
          u.name,
          u.email,
          u.image,
          u.role,
          u.createdAt,
          u.updatedAt,
          u.banned_at as bannedAt,
          u.ban_reason as banReason,
          ls.lastLoginAt,
          coalesce(pc.cnt, 0) as projectCount
        from users u
        left join (
          select userId, max(createdAt) as lastLoginAt
          from sessions
          group by userId
        ) ls on ls.userId = u.id
        left join (
          select owner_user_id, count(*) as cnt
          from projects
          where archived_at is null
          group by owner_user_id
        ) pc on pc.owner_user_id = u.id
        order by u.createdAt desc, u.email asc
      `
    )
    .all<AdminUserRow>();

  return result.results.map(mapAdminUser);
}

export const countUsersForAdmin = cache(async function countUsersForAdmin() {
  const db = await getDatabase();
  const row = await db
    .prepare(
      `
        select count(*) as count
        from users
      `
    )
    .first<CountRow>();

  return Number(row?.count ?? 0);
});

export async function getAdminUserById(
  userId: string
): Promise<AdminUser | null> {
  const db = await getDatabase();
  const row = await db
    .prepare(
      `
        select
          u.id,
          u.name,
          u.email,
          u.image,
          u.role,
          u.createdAt,
          u.updatedAt,
          u.banned_at as bannedAt,
          u.ban_reason as banReason,
          ls.lastLoginAt,
          coalesce(pc.cnt, 0) as projectCount
        from users u
        left join (
          select userId, max(createdAt) as lastLoginAt
          from sessions
          where userId = ?1
          group by userId
        ) ls on ls.userId = u.id
        left join (
          select owner_user_id, count(*) as cnt
          from projects
          where archived_at is null
          group by owner_user_id
        ) pc on pc.owner_user_id = u.id
        where u.id = ?1
        limit 1
      `
    )
    .bind(userId)
    .first<AdminUserRow>();

  return row ? mapAdminUser(row) : null;
}

export async function countUsersByRole(role: AccountRole) {
  const db = await getDatabase();
  const result = await db
    .prepare(
      `
        select 1
        from users
        where role = ?
        limit 2
      `
    )
    .bind(role)
    .all<Record<string, never>>();

  return result.results.length;
}

export async function updateUserRole(
  userId: string,
  role: AccountRole
): Promise<AdminUser | null> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const row = await db
    .prepare(
      `
        update users
        set role = ?, updatedAt = ?
        where id = ?
        returning
          id, name, email, image, role, createdAt, updatedAt,
          banned_at as bannedAt, ban_reason as banReason
      `
    )
    .bind(role, now, userId)
    .first<AdminUserRow>();

  return row ? mapAdminUser(row) : null;
}

export async function banUser(
  userId: string,
  reason: string
): Promise<AdminUser | null> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const row = await db
    .prepare(
      `
        update users
        set banned_at = ?, ban_reason = ?, updatedAt = ?
        where id = ?
        returning
          id, name, email, image, role, createdAt, updatedAt,
          banned_at as bannedAt, ban_reason as banReason
      `
    )
    .bind(now, reason, now, userId)
    .first<AdminUserRow>();

  await db
    .prepare(
      `
        delete from sessions
        where userId = ?
      `
    )
    .bind(userId)
    .run();

  return row ? mapAdminUser(row) : null;
}

export async function unbanUser(userId: string): Promise<AdminUser | null> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const row = await db
    .prepare(
      `
        update users
        set banned_at = null, ban_reason = null, updatedAt = ?
        where id = ?
        returning
          id, name, email, image, role, createdAt, updatedAt,
          banned_at as bannedAt, ban_reason as banReason
      `
    )
    .bind(now, userId)
    .first<AdminUserRow>();

  return row ? mapAdminUser(row) : null;
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const db = await getDatabase();

  await deleteSharesOwnedByUser(userId);

  await db
    .prepare(
      `
        delete from apikey
        where referenceId = ?
      `
    )
    .bind(userId)
    .run();

  await db
    .prepare(
      `
        delete from projects
        where owner_user_id = ?
      `
    )
    .bind(userId)
    .run();

  await db
    .prepare(
      `
        delete from users
        where id = ?
      `
    )
    .bind(userId)
    .run();
}

export async function getUserContextStats(
  userId: string
): Promise<UserContextStats> {
  const db = await getDatabase();

  const projectRow = await db
    .prepare(
      `
        select count(*) as count
        from projects
        where owner_user_id = ?
          and archived_at is null
      `
    )
    .bind(userId)
    .first<CountRow>();

  const shareRow = await db
    .prepare(
      `
        select count(*) as count
        from shares
        where owner_user_id = ?
          and revoked_at is null
          and (expires_at is null or datetime(expires_at) > datetime('now'))
      `
    )
    .bind(userId)
    .first<CountRow>();

  const galleryRow = await db
    .prepare(
      `
        select count(*) as count
        from gallery_entries
        where owner_user_id = ?
      `
    )
    .bind(userId)
    .first<CountRow>();

  const apiKeyRow = await db
    .prepare(
      `
        select count(*) as count
        from apikey
        where referenceId = ?
          and enabled = 1
          and (expiresAt is null or datetime(expiresAt) > datetime('now'))
      `
    )
    .bind(userId)
    .first<CountRow>();

  return {
    projectCount: Number(projectRow?.count ?? 0),
    activeShareCount: Number(shareRow?.count ?? 0),
    galleryEntryCount: Number(galleryRow?.count ?? 0),
    apiKeyCount: Number(apiKeyRow?.count ?? 0),
  };
}
