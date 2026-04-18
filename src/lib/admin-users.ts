import type { AccountRole } from "@/lib/account-roles";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: AccountRole;
  createdAt: string;
  updatedAt: string;
};
