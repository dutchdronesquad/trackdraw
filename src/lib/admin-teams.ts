import { z } from "zod";
export type AdminTeam = {
  id: string;
  name: string;
  ownerId: string | null;
  ownerName: string | null;
  memberCount: number;
  projectCount: number;
  state: "active" | "open" | "recovery";
  deadline: string | null;
};
export type AdminTeamMember = {
  id: string;
  name: string;
  role: "owner" | "editor" | "viewer";
  canOwn: boolean;
};
export const adminOwnerChangeSchema = z.strictObject({
  teamId: z.string().min(1).max(128),
  ownerId: z.string().min(1).max(128).nullable(),
  targetId: z.string().min(1).max(128),
  reason: z.string().trim().min(1).max(1000),
});
