import { z } from "zod";
const id = z.string().min(1).max(128);
export const successionCommandSchema = z.strictObject({
  caseId: id,
  action: z.enum(["apply", "withdraw", "confirm-notice", "retry-notice"]),
  noticeId: id.optional(),
  reason: z.string().trim().max(1000).default(""),
});
export type SuccessionCommand = z.input<typeof successionCommandSchema>;
export type SuccessionCase = {
  id: string;
  teamId: string;
  teamName: string;
  state: "open" | "recovery" | "resolved";
  removalAt: string;
  purgeAt: string | null;
  canApply: boolean;
  viewerId: string;
  notices?: {
    id: string;
    event: string;
    sentAt: string | null;
    uncertain: number;
    recipient: string;
    deliveryKey: string;
  }[];
  applications: {
    id: string;
    userId: string;
    name: string;
    requestedAt: string;
    responseAt: string | null;
    withdrawnAt: string | null;
    eligible: boolean;
  }[];
  memberCount: number;
};
