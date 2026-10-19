import { z } from "zod";

export const apiKeyProjectAccessSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("all") }).strict(),
  z
    .object({
      mode: z.literal("selected"),
      projectIds: z.array(z.string().trim().min(1).max(128)).max(100),
    })
    .strict(),
]);

export type ApiKeyProjectAccess = z.infer<typeof apiKeyProjectAccessSchema>;

/** Keys predating project access retain all owned projects. Invalid explicit access denies all. */
export function apiKeyProjectAccess(metadata: unknown): ApiKeyProjectAccess {
  if (metadata == null) return { mode: "all" };
  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return { mode: "selected", projectIds: [] };
  }
  if (!("projectAccess" in metadata)) return { mode: "all" };
  const result = apiKeyProjectAccessSchema.safeParse(metadata.projectAccess);
  return result.success ? result.data : { mode: "selected", projectIds: [] };
}
