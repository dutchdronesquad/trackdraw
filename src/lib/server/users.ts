import "server-only";

import { parseAccountRole, type AccountRole } from "@/lib/account-roles";
import type { AdminUser } from "@/lib/admin-users";
import { getDatabase } from "@/lib/server/db";

type UserRoleRow = {
  role: string | null;
};

type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
  createdAt: string;
  updatedAt: string;
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
          id,
          name,
          email,
          image,
          role,
          createdAt,
          updatedAt
        from users
        order by createdAt desc, email asc
      `
    )
    .all<AdminUserRow>();

  return result.results.map(mapAdminUser);
}

export async function getAdminUserById(
  userId: string
): Promise<AdminUser | null> {
  const db = await getDatabase();
  const row = await db
    .prepare(
      `
        select
          id,
          name,
          email,
          image,
          role,
          createdAt,
          updatedAt
        from users
        where id = ?
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
        returning id, name, email, image, role, createdAt, updatedAt
      `
    )
    .bind(role, now, userId)
    .first<AdminUserRow>();

  return row ? mapAdminUser(row) : null;
}
