import "server-only";
import { customAlphabet } from "nanoid";
import { getDatabase } from "./db";
import { getProjectForActor } from "./projects";
import { TeamProjectError } from "./team-project-error";
import { deleteGalleryPreviewImage } from "./gallery-media";
import { getDesignShapes, serializeDesignForShare } from "@/lib/track/design";
import { getShareDescription } from "@/lib/share";
import type { TeamPublicationCommand } from "@/lib/team-projects";
import { publicTeamSnapshot } from "@/lib/track/public-snapshot";

const tokenFor = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  16
);
// Include this in every statement that reads management metadata or changes publication.
const ownerGuard = `EXISTS (SELECT 1 FROM projects p JOIN team_members m ON m.organizationId=p.owner_team_id
 WHERE p.id=? AND p.owner_team_id=? AND p.owner_user_id IS NULL AND p.archived_at IS NULL
 AND m.userId=? AND m.role='owner')`;

export async function readTeamPublication(
  userId: string,
  teamId: string,
  projectId: string
) {
  const db = await getDatabase();
  const bindings = [projectId, teamId, userId];
  if (
    !(await db
      .prepare(`SELECT 1 AS allowed WHERE ${ownerGuard}`)
      .bind(...bindings)
      .first())
  )
    throw new TeamProjectError("not_found");
  const rows = await db
    .prepare(
      `SELECT s.token, s.title, s.share_type AS shareType, s.expires_at AS expiresAt,
    g.gallery_state AS galleryState, g.gallery_title AS galleryTitle, g.gallery_description AS galleryDescription
    FROM shares s LEFT JOIN gallery_entries g ON g.share_token=s.token
    WHERE s.project_id=? AND s.revoked_at IS NULL AND (s.expires_at IS NULL OR julianday(s.expires_at)>julianday('now'))
    AND ${ownerGuard} ORDER BY s.updated_at DESC, s.token LIMIT 101`
    )
    .bind(projectId, ...bindings)
    .all<{
      token: string;
      title: string;
      shareType: "temporary" | "published";
      expiresAt: string | null;
      galleryState: string | null;
      galleryTitle: string | null;
      galleryDescription: string | null;
    }>();
  // Existing projects can have multiple deliberate links; none is hidden from management.
  if (rows.results.length > 100) throw new TeamProjectError("invalid", 400);
  return {
    shares: rows.results,
    share:
      rows.results.find((s) => s.shareType === "published") ??
      rows.results[0] ??
      null,
  };
}

export async function changeTeamPublication(
  userId: string,
  command: TeamPublicationCommand
) {
  const { teamId, projectId } = command;
  const db = await getDatabase();
  const bindings = [projectId, teamId, userId];
  const now = new Date().toISOString();
  if (command.action === "publish") {
    const project = await getProjectForActor(
      projectId,
      { userId, scope: { kind: "team", teamId } },
      "publish"
    );
    if (!project) throw new TeamProjectError("not_found");
    if (project.revision !== command.revision)
      throw new TeamProjectError("conflict", 409);
    const existing = await readTeamPublication(userId, teamId, projectId);
    const selected = command.token
      ? existing.shares.find(
          (share) =>
            share.token === command.token && share.shareType === "published"
        )
      : existing.share;
    if (command.token && !selected) throw new TeamProjectError("not_found");
    const token =
      selected?.shareType === "published" ? selected.token : tokenFor();
    const snapshot = publicTeamSnapshot(project.design, token);
    const serialized = JSON.stringify(serializeDesignForShare(snapshot));
    const description = getShareDescription(snapshot);
    // The revision/owner check and snapshot write are one statement, including retries on a stable token.
    const row = await db
      .prepare(
        `INSERT INTO shares
      (id,token,design_json,title,description,field_width,field_height,shape_count,created_at,updated_at,published_at,owner_user_id,project_id,share_type)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,'published' WHERE ${ownerGuard}
      AND EXISTS (SELECT 1 FROM projects WHERE id=? AND revision=?)
      ON CONFLICT(token) DO UPDATE SET design_json=excluded.design_json,title=excluded.title,description=excluded.description,
      field_width=excluded.field_width,field_height=excluded.field_height,shape_count=excluded.shape_count,
      updated_at=excluded.updated_at,expires_at=NULL
      WHERE shares.project_id=excluded.project_id AND shares.revoked_at IS NULL
      RETURNING token`
      )
      .bind(
        crypto.randomUUID(),
        token,
        serialized,
        snapshot.title,
        description,
        snapshot.field.width,
        snapshot.field.height,
        getDesignShapes(snapshot).length,
        now,
        now,
        now,
        userId,
        projectId,
        ...bindings,
        projectId,
        command.revision
      )
      .first<{ token: string }>();
    if (!row) throw new TeamProjectError("conflict", 409);
    // A published snapshot refresh invalidates its old gallery preview; no private canvas upload is accepted here.
    await db
      .prepare(
        `UPDATE gallery_entries SET gallery_preview_image=NULL,updated_at=? WHERE share_token=?
      AND ${ownerGuard} RETURNING id`
      )
      .bind(now, token, ...bindings)
      .first();
    const published = (
      await readTeamPublication(userId, teamId, projectId)
    ).shares.find((share) => share.token === token);
    if (!published) throw new TeamProjectError("not_found");
    return published;
  }
  const { token } = command;
  if (command.action === "revoke") {
    const row = await db
      .prepare(
        `UPDATE shares SET revoked_at=?,updated_at=? WHERE token=? AND project_id=?
      AND revoked_at IS NULL AND ${ownerGuard} RETURNING token`
      )
      .bind(now, now, token, projectId, ...bindings)
      .first();
    if (!row) throw new TeamProjectError("not_found");
    // Revocation hides all public routes immediately; cleanup cannot affect any other token.
    const deleted = await db
      .prepare(
        `DELETE FROM gallery_entries WHERE share_token=?
      AND EXISTS(SELECT 1 FROM shares WHERE token=? AND revoked_at IS NOT NULL)
      RETURNING gallery_preview_image AS image`
      )
      .bind(token, token)
      .first<{ image: string | null }>();
    if (deleted?.image) await deleteGalleryPreviewImage(deleted.image);
    return null;
  }
  const activeGuard = `EXISTS(SELECT 1 FROM shares WHERE token=? AND project_id=? AND revoked_at IS NULL
    AND (expires_at IS NULL OR julianday(expires_at)>julianday('now'))) AND ${ownerGuard}`;
  const activeBindings = [token, projectId, ...bindings];
  if (command.action === "unlist") {
    const row = await db
      .prepare(
        `DELETE FROM gallery_entries WHERE share_token=? AND gallery_state<>'hidden'
      AND ${activeGuard} RETURNING gallery_preview_image AS image`
      )
      .bind(token, ...activeBindings)
      .first<{ image: string | null }>();
    if (!row) throw new TeamProjectError("not_found");
    if (row.image) await deleteGalleryPreviewImage(row.image);
  } else {
    const row = await db
      .prepare(
        `INSERT INTO gallery_entries
      (id,share_token,owner_user_id,gallery_state,gallery_title,gallery_description,gallery_published_at,created_at,updated_at)
      SELECT ?,?,?,'listed',?,?,?,?,? WHERE ${activeGuard}
      ${command.action === "update" ? `AND EXISTS(SELECT 1 FROM gallery_entries WHERE share_token=? AND gallery_state IN ('listed','featured'))` : ""}
      ON CONFLICT(share_token) DO UPDATE SET gallery_title=excluded.gallery_title,gallery_description=excluded.gallery_description,
        gallery_state=CASE WHEN gallery_entries.gallery_state='featured' THEN 'featured' ELSE 'listed' END,
        gallery_published_at=COALESCE(gallery_entries.gallery_published_at,excluded.gallery_published_at),updated_at=excluded.updated_at
      WHERE gallery_entries.gallery_state<>'hidden' ${command.action === "update" ? "AND gallery_entries.gallery_state IN ('listed','featured')" : ""}
      RETURNING id`
      )
      .bind(
        crypto.randomUUID(),
        token,
        userId,
        command.title,
        command.description,
        now,
        now,
        now,
        ...activeBindings,
        ...(command.action === "update" ? [token] : [])
      )
      .first();
    if (!row) throw new TeamProjectError("not_found");
  }
  return (
    (await readTeamPublication(userId, teamId, projectId)).shares.find(
      (s) => s.token === token
    ) ?? null
  );
}
