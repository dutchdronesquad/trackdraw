import type { AccountRole } from "@/lib/account/roles";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: AccountRole;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  removalAt: string | null;
  projectCount: number;
  bannedAt: string | null;
  banReason: string | null;
};

export const INACTIVE_ACCOUNT_MONTHS = 11;

export function isInactiveAccount(user: AdminUser, now = new Date()) {
  if (!user.lastActiveAt) return false;
  const threshold = new Date(now);
  threshold.setUTCMonth(threshold.getUTCMonth() - INACTIVE_ACCOUNT_MONTHS);
  return new Date(user.lastActiveAt) <= threshold;
}
