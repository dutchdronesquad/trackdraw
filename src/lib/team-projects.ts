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

export type ProjectEditor = { userId: string; name: string; expiresAt: string };
export const teamEditingCommandSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("acquire"), teamId: id, projectId: id }),
  z.strictObject({
    action: z.literal("renew"),
    teamId: id,
    projectId: id,
    sessionId: z.uuid(),
  }),
  z.strictObject({
    action: z.literal("release"),
    teamId: id,
    projectId: id,
    sessionId: z.uuid(),
  }),
  z.strictObject({
    action: z.literal("save"),
    teamId: id,
    projectId: id,
    sessionId: z.uuid(),
    revision: z.number().int().positive(),
    design: z.unknown(),
  }),
]);
export type TeamEditingCommand = z.infer<typeof teamEditingCommandSchema>;

const publicationContext = { teamId: id, projectId: id };
const publicationMetadata = {
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(10).max(500),
};
export const teamPublicationCommandSchema = z.discriminatedUnion("action", [
  z.strictObject({
    ...publicationContext,
    action: z.literal("publish"),
    token: id.optional(),
    revision: z.number().int().positive(),
    view: z.enum(["2d", "3d"]).optional(),
  }),
  z.strictObject({
    ...publicationContext,
    token: id,
    action: z.literal("revoke"),
  }),
  z.strictObject({
    ...publicationContext,
    token: id,
    action: z.literal("unlist"),
  }),
  z.strictObject({
    ...publicationContext,
    token: id,
    ...publicationMetadata,
    action: z.literal("list"),
  }),
  z.strictObject({
    ...publicationContext,
    token: id,
    ...publicationMetadata,
    action: z.literal("update"),
  }),
]);
export type TeamPublicationCommand = z.infer<
  typeof teamPublicationCommandSchema
>;
