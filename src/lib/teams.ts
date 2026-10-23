import { z } from "zod";
import type { TeamRole } from "@/lib/server/project-authorization";

const id = z.string().min(1).max(128);
const name = z.string().trim().min(1).max(80);
const role = z.enum(["editor", "viewer"]);
export const teamDeletionImpactSchema = z.strictObject({
  projects: z.number().int().nonnegative(),
  members: z.number().int().nonnegative(),
  invitations: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  galleryEntries: z.number().int().nonnegative(),
  editingSessions: z.number().int().nonnegative(),
});
export type TeamDeletionImpact = z.infer<typeof teamDeletionImpactSchema>;
export const teamCommandSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("create"), name }),
  z.strictObject({ action: z.literal("rename"), teamId: id, name }),
  z.strictObject({
    action: z.literal("invite"),
    teamId: id,
    email: z.email().trim().toLowerCase().max(254),
    role,
  }),
  z.strictObject({ action: z.literal("resend"), teamId: id, invitationId: id }),
  z.strictObject({ action: z.literal("revoke"), teamId: id, invitationId: id }),
  z.strictObject({ action: z.literal("role"), teamId: id, userId: id, role }),
  z.strictObject({ action: z.literal("remove"), teamId: id, userId: id }),
  z.strictObject({ action: z.literal("leave"), teamId: id }),
  z.strictObject({
    action: z.literal("transfer-owner"),
    teamId: id,
    userId: id,
  }),
  z.strictObject({
    action: z.literal("delete"),
    teamId: id,
    confirmation: name,
    impact: teamDeletionImpactSchema,
  }),
  z.strictObject({ action: z.literal("accept"), invitationId: id }),
]);
export type TeamCommand = z.infer<typeof teamCommandSchema>;
export type TeamSummary = {
  id: string;
  name: string;
  role: TeamRole;
  recovery?: boolean;
  memberPreview?: { total: number; names: string[] };
};
export type TeamInvitation = {
  id: string;
  teamId: string;
  teamName: string;
  role: "editor" | "viewer";
  status:
    "sending" | "pending" | "accepted" | "rejected" | "canceled" | "expired";
  expiresAt: string;
};
export type TeamOverview = {
  teams: (TeamSummary & { projectCount: number })[];
  invitations: TeamInvitation[];
};
export type TeamDetails = TeamSummary & {
  deletionImpact?: TeamDeletionImpact;
  members: {
    userId: string;
    name: string | null;
    email: string;
    role: TeamRole;
  }[];
  invitations: (TeamInvitation & { email: string })[];
};
export const teamErrorCodes = [
  "unauthorized",
  "verification",
  "not_found",
  "invalid",
  "limit",
  "owner_required",
  "impact_changed",
  "transfer_invalid",
  "delivery",
  "failed",
] as const;
export type TeamErrorCode = (typeof teamErrorCodes)[number];
