import { z } from "zod";

const id = z.string().min(1).max(128);
export const teamProjectCommandSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("create"),
    teamId: id,
    title: z.string().trim().min(1).max(160),
  }),
  z.strictObject({
    action: z.literal("move"),
    teamId: id,
    projectId: id,
    revision: z.number().int().positive(),
    publicationVersion: z.string().max(64),
  }),
]);
export type TeamProjectCommand = z.infer<typeof teamProjectCommandSchema>;
export type TeamProjectSummary = {
  id: string;
  title: string;
  revision: number;
  updatedAt: string;
  shapeCount: number;
};
export type ProjectMovePreview = {
  projectId: string;
  title: string;
  revision: number;
  publicationVersion: string;
  shareCount: number;
  galleryCount: number;
};
export function teamProjectHref(teamId: string, projectId: string) {
  return `/studio?teamId=${encodeURIComponent(teamId)}&teamProject=${encodeURIComponent(projectId)}`;
}
