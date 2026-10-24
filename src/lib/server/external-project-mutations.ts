import "server-only";
import { deleteGalleryPreviewImage } from "./gallery-media";
import { z } from "zod";
import { authenticateApiRequest, apiSuccess } from "./api-v1";
import {
  externalActor,
  requireExternalProject,
  ExternalProjectError,
  externalFailure,
} from "./external-projects";
import { getDatabase } from "./db";
import {
  projectAuthorizationPredicate,
  type ProjectActor,
} from "./project-authorization";
import {
  acquireProjectLease,
  releaseProjectLease,
  renewProjectLease,
  saveTeamProject,
} from "./team-project-leases";
import { readBoundedRequestBody } from "./bounded-request-body";
import { parseDesign } from "@/lib/track/design";
import { serializeDesign } from "@/lib/track/design";
import { validateTrackDraft } from "@/lib/track/draft";
import { createMcpProjectForUser, saveProjectForUser } from "./projects";
import { getSiteUrl } from "@/lib/seo";

type Context = { params: Promise<{ projectId: string }> };
const revision = z.number().int().positive();
const session = z.uuid().optional();
const writeSchema = z.strictObject({
  design: z.unknown(),
  base_revision: revision,
  session_id: session,
});
const archiveSchema = z.strictObject({
  base_revision: revision,
  session_id: session,
});
const leaseSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("acquire") }),
  z.strictObject({ action: z.literal("renew"), session_id: z.uuid() }),
  z.strictObject({ action: z.literal("release"), session_id: z.uuid() }),
]);
async function body(request: Request, max = 2_097_152) {
  const content = await readBoundedRequestBody(request, max);
  if (content.tooLarge)
    throw new ExternalProjectError("payload_too_large", 413);
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(content.bytes)
    ) as unknown;
  } catch {
    throw new ExternalProjectError("invalid_payload", 400);
  }
}
function validated<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ExternalProjectError("invalid_payload", 400);
  return parsed.data;
}
async function inLease<T>(
  actor: ProjectActor,
  id: string,
  token: string | undefined,
  run: (sessionId: string) => Promise<T>
) {
  if (actor.scope.kind !== "team")
    throw new ExternalProjectError("invalid_context", 400);
  const acquired = token
    ? null
    : await acquireProjectLease(actor.userId, actor.scope.teamId, id, actor);
  const sessionId = token ?? acquired!.lease.sessionId;
  try {
    return await run(sessionId);
  } finally {
    if (acquired) await releaseProjectLease(actor.userId, id, sessionId);
  }
}
export async function externalEditing(request: Request, context: Context) {
  try {
    const auth = await authenticateApiRequest(request, {
      projects: ["update"],
    });
    if (!auth.ok) return auth.response;
    const actor = externalActor(request, auth.identity);
    const { projectId } = await context.params;
    await requireExternalProject(actor, projectId, "update");
    if (actor.scope.kind !== "team")
      throw new ExternalProjectError("invalid_context", 400);
    const command = validated(leaseSchema, await body(request, 4096));
    if (command.action === "acquire") {
      const result = await acquireProjectLease(
        actor.userId,
        actor.scope.teamId,
        projectId,
        actor
      );
      return apiSuccess(
        {
          session_id: result.lease.sessionId,
          expires_at: result.lease.expiresAt,
          revision: result.project.revision,
          design: serializeDesign(result.project.design),
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    if (command.action === "release") {
      await releaseProjectLease(actor.userId, projectId, command.session_id);
      return apiSuccess({ released: true });
    }
    const result = await renewProjectLease(
      actor.userId,
      actor.scope.teamId,
      projectId,
      command.session_id,
      actor
    );
    return apiSuccess({
      session_id: result.lease.sessionId,
      expires_at: result.lease.expiresAt,
    });
  } catch (error) {
    return externalFailure(error);
  }
}
export async function updateExternalProject(
  request: Request,
  context: Context
) {
  try {
    const auth = await authenticateApiRequest(request, {
      projects: ["update"],
    });
    if (!auth.ok) return auth.response;
    const actor = externalActor(request, auth.identity);
    const { projectId } = await context.params;
    await requireExternalProject(actor, projectId, "update");
    const command = validated(writeSchema, await body(request));
    const design = parseDesign(command.design);
    if (!design || design.id !== projectId)
      throw new ExternalProjectError("invalid_payload", 400);
    if (actor.scope.kind === "personal") {
      const project = await saveProjectForUser(actor.userId, design, {
        projectId,
        baseRevision: command.base_revision,
      });
      return apiSuccess({ id: project.id, revision: project.revision });
    }
    const teamId = actor.scope.teamId;
    const result = await inLease(
      actor,
      projectId,
      command.session_id,
      (token) =>
        saveTeamProject(
          actor.userId,
          teamId,
          projectId,
          token,
          command.base_revision,
          design,
          actor
        )
    );
    return apiSuccess({ id: projectId, revision: result.revision });
  } catch (error) {
    return externalFailure(error);
  }
}
export async function archiveExternalProject(
  request: Request,
  context: Context
) {
  try {
    const auth = await authenticateApiRequest(request, {
      projects: ["archive"],
    });
    if (!auth.ok) return auth.response;
    const actor = externalActor(request, auth.identity);
    const { projectId } = await context.params;
    const project = await requireExternalProject(actor, projectId, "archive");
    const command = validated(archiveSchema, await body(request, 4096));
    if (project.revision !== command.base_revision)
      throw new ExternalProjectError("conflict", 409);
    if (actor.scope.kind === "personal") {
      const db = await getDatabase();
      const access = projectAuthorizationPredicate(actor, "archive");
      const result = await db.batch<{ gallery_preview_image: string | null }>([
        db
          .prepare(
            `UPDATE projects SET archived_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),revision=revision+1 WHERE id=? AND archived_at IS NULL AND revision=? AND ${access.sql} RETURNING id`
          )
          .bind(projectId, command.base_revision, ...access.bindings),
        ...archivedPublicationStatements(db, projectId, actor),
      ]);
      if (!result[0].results.length)
        throw new ExternalProjectError("conflict", 409);
      await cleanArchivedMedia(result.at(-1)?.results ?? []);
      return apiSuccess({ archived: true });
    }
    await inLease(actor, projectId, command.session_id, async (token) => {
      const db = await getDatabase();
      const access = projectAuthorizationPredicate(actor, "archive");
      const results = await db.batch<{ gallery_preview_image: string | null }>([
        db
          .prepare(
            `DELETE FROM project_edit_leases WHERE project_id=? AND user_id=? AND session_id=? AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') RETURNING project_id`
          )
          .bind(projectId, actor.userId, token),
        db
          .prepare(
            `UPDATE projects SET archived_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),revision=revision+1 WHERE id=? AND archived_at IS NULL AND revision=? AND ${access.sql} AND changes()=1 RETURNING id`
          )
          .bind(projectId, command.base_revision, ...access.bindings),
        ...archivedPublicationStatements(db, projectId, actor),
      ]);
      if (!results[1].results.length)
        throw new ExternalProjectError("conflict", 409);
      await cleanArchivedMedia(results.at(-1)?.results ?? []);
    });
    return apiSuccess({ archived: true });
  } catch (error) {
    return externalFailure(error);
  }
}
function archivedPublicationStatements(
  db: Awaited<ReturnType<typeof getDatabase>>,
  id: string,
  actor: ProjectActor
) {
  const access = projectAuthorizationPredicate(actor, "archive");
  const archived = `EXISTS(SELECT 1 FROM projects WHERE id=? AND archived_at IS NOT NULL AND ${access.sql})`;
  return [
    db
      .prepare(
        `UPDATE shares SET revoked_at=COALESCE(revoked_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE project_id=? AND ${archived} RETURNING token`
      )
      .bind(id, id, ...access.bindings),
    db
      .prepare(
        `DELETE FROM gallery_entries WHERE share_token IN(SELECT token FROM shares WHERE project_id=? AND revoked_at IS NOT NULL) AND ${archived} RETURNING gallery_preview_image`
      )
      .bind(id, id, ...access.bindings),
  ];
}
async function cleanArchivedMedia(
  rows: { gallery_preview_image: string | null }[]
) {
  for (const row of rows) {
    try {
      await deleteGalleryPreviewImage(row.gallery_preview_image);
    } catch {
      console.error("[TrackDraw] Archived gallery media cleanup failed");
    }
  }
}
export async function createExternalProject(request: Request) {
  try {
    const auth = await authenticateApiRequest(request, {
      projects: ["create"],
    });
    if (!auth.ok) return auth.response;
    const actor = externalActor(request, auth.identity);
    if (actor.projectIds)
      throw new ExternalProjectError("selected_projects_cannot_create", 403);
    const command = validated(
      z.strictObject({
        idempotency_key: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
        proposal: z.unknown(),
      }),
      await body(request)
    );
    const draft = validateTrackDraft(command.proposal);
    if (!draft.ok) throw new ExternalProjectError("invalid_payload", 400);
    const payload = JSON.stringify({
      proposal: draft.proposal,
      scope: actor.scope,
    });
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload))
      ),
      (b) => b.toString(16).padStart(2, "0")
    ).join("");
    const { project, replayed } = await createMcpProjectForUser(
      actor.userId,
      draft.design,
      command.idempotency_key,
      hash,
      actor
    );
    return apiSuccess(
      {
        id: project.id,
        revision: project.revision,
        replayed,
        studio_url: new URL(
          actor.scope.kind === "team"
            ? `/studio?teamId=${encodeURIComponent(actor.scope.teamId)}&teamProject=${encodeURIComponent(project.id)}`
            : `/studio/open/${encodeURIComponent(project.id)}`,
          getSiteUrl()
        ).href,
      },
      { status: replayed ? 200 : 201 }
    );
  } catch (error) {
    return externalFailure(error);
  }
}
