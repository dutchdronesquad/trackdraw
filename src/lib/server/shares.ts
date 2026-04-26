import "server-only";

import { customAlphabet } from "nanoid";
import {
  getDesignShapes,
  normalizeDesign,
  serializeDesign,
} from "@/lib/track/design";
import {
  createUnlistedGalleryEntry,
  deleteGalleryEntry,
  getGalleryEntryByShareToken,
  parseGalleryState,
} from "@/lib/server/gallery";
import { getShareDescription, getShareTitle } from "@/lib/share";
import type { SerializedTrackDesign, TrackDesign } from "@/lib/types";
import { getDatabase } from "@/lib/server/db";

const createShareToken = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  16
);

export const DEFAULT_SHARE_EXPIRY_DAYS = 90;

export const shareTypes = ["temporary", "published"] as const;
export type ShareType = (typeof shareTypes)[number];

type ShareRow = {
  id: string;
  token: string;
  design_json: SerializedTrackDesign | string;
  title: string | null;
  description: string | null;
  field_width: number | null;
  field_height: number | null;
  shape_count: number;
  created_at: string;
  updated_at: string;
  published_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  owner_user_id: string | null;
  project_id: string | null;
  share_type: string | null;
};

export type StoredShare = {
  id: string;
  token: string;
  design: TrackDesign;
  title: string;
  description: string;
  shapeCount: number;
  fieldWidth: number | null;
  fieldHeight: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  ownerUserId: string | null;
  projectId: string | null;
  shareType: ShareType;
};

export type StoredShareResolution =
  | { status: "available"; share: StoredShare }
  | { status: "expired"; share: StoredShare }
  | { status: "revoked"; share: StoredShare }
  | { status: "missing" };

const SHARE_SELECT = `
  id,
  token,
  design_json,
  title,
  description,
  field_width,
  field_height,
  shape_count,
  created_at,
  updated_at,
  published_at,
  expires_at,
  revoked_at,
  owner_user_id,
  project_id,
  share_type
`;

const USER_SHARE_SELECT = `
  s.token,
  s.title,
  s.shape_count,
  s.created_at,
  s.expires_at,
  s.project_id,
  s.share_type,
  g.gallery_state,
  g.gallery_title,
  g.gallery_description
`;

const ACTIVE_USER_SHARE_WHERE = `
  s.revoked_at is null
  and (s.expires_at is null or s.expires_at > ?)
`;

function nowIso() {
  return new Date().toISOString();
}

function toIsoDateAfterDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function parseNullableNumber(value: number | null) {
  return value === null ? null : Number.parseFloat(String(value));
}

function parseShareType(value: string | null): ShareType {
  return value === "published" ? "published" : "temporary";
}

function mapShareRow(row: ShareRow): StoredShare {
  const rawDesign =
    typeof row.design_json === "string"
      ? (JSON.parse(row.design_json) as SerializedTrackDesign)
      : row.design_json;
  const design = normalizeDesign(rawDesign);

  return {
    id: row.id,
    token: row.token,
    design,
    title: row.title ?? getShareTitle(design),
    description: row.description ?? getShareDescription(design),
    shapeCount: row.shape_count,
    fieldWidth: parseNullableNumber(row.field_width),
    fieldHeight: parseNullableNumber(row.field_height),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    ownerUserId: row.owner_user_id,
    projectId: row.project_id,
    shareType: parseShareType(row.share_type),
  };
}

function mapUserShareRow(row: UserShareRow): UserShare {
  return {
    token: row.token,
    title: row.title ?? "Untitled track",
    shapeCount: row.shape_count,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    projectId: row.project_id,
    shareType: parseShareType(row.share_type),
    galleryState: parseGalleryState(row.gallery_state),
    galleryTitle: row.gallery_title,
    galleryDescription: row.gallery_description,
  };
}

export async function resolveStoredShare(
  token: string
): Promise<StoredShareResolution> {
  const db = await getDatabase();
  const row = await db
    .prepare(
      `
        select
          ${SHARE_SELECT}
        from shares
        where token = ?
        limit 1
      `
    )
    .bind(token)
    .first<ShareRow>();

  if (!row) return { status: "missing" };

  const share = mapShareRow(row);
  if (share.revokedAt) {
    return { status: "revoked", share };
  }

  if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
    return { status: "expired", share };
  }

  return { status: "available", share };
}

export async function getShareByToken(token: string) {
  const resolved = await resolveStoredShare(token);
  return resolved.status === "available" ? resolved.share : null;
}

type UserShareRow = {
  token: string;
  title: string | null;
  shape_count: number;
  created_at: string;
  expires_at: string | null;
  project_id: string | null;
  share_type: string | null;
  gallery_state: string | null;
  gallery_title: string | null;
  gallery_description: string | null;
};

export type UserShare = {
  token: string;
  title: string;
  shapeCount: number;
  createdAt: string;
  expiresAt: string | null;
  projectId: string | null;
  shareType: ShareType;
  galleryState: "unlisted" | "listed" | "featured" | "hidden" | null;
  galleryTitle: string | null;
  galleryDescription: string | null;
};

export async function getSharesByUserId(
  userId: string,
  { limit = 20 }: { limit?: number } = {}
): Promise<UserShare[]> {
  const db = await getDatabase();
  const now = nowIso();

  const rows = await db
    .prepare(
      `
        select
          ${USER_SHARE_SELECT}
        from shares s
        left join gallery_entries g on g.share_token = s.token
        where s.owner_user_id = ?
          and ${ACTIVE_USER_SHARE_WHERE}
        order by s.created_at desc
        limit ?
      `
    )
    .bind(userId, now, limit)
    .all<UserShareRow>();

  return (rows.results ?? []).map(mapUserShareRow);
}

export async function getShareByProjectIdForUser(
  userId: string,
  projectId: string
): Promise<UserShare | null> {
  const db = await getDatabase();
  const now = nowIso();

  const row = await db
    .prepare(
      `
        select
          ${USER_SHARE_SELECT}
        from shares s
        left join gallery_entries g on g.share_token = s.token
        where s.owner_user_id = ?
          and s.project_id = ?
          and s.share_type = 'published'
          and ${ACTIVE_USER_SHARE_WHERE}
        order by
          case g.gallery_state
            when 'featured' then 0
            when 'listed' then 1
            when 'hidden' then 2
            when 'unlisted' then 3
            else 4
          end,
          s.created_at desc
        limit 1
      `
    )
    .bind(userId, projectId, now)
    .first<UserShareRow>();

  if (!row) {
    return null;
  }

  return mapUserShareRow(row);
}

export async function revokeShare(token: string) {
  const db = await getDatabase();
  const now = nowIso();

  await db
    .prepare(
      `
        update shares
        set revoked_at = ?, updated_at = ?
        where token = ? and revoked_at is null
      `
    )
    .bind(now, now, token)
    .run();

  await deleteGalleryEntry(token);
}

type CreateShareOptions = {
  expiresInDays?: number;
  ownerUserId?: string | null;
  projectId?: string | null;
};

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Error &&
    /UNIQUE constraint failed|SQLITE_CONSTRAINT/i.test(error.message)
  );
}

export async function createShare(
  design: TrackDesign,
  options: CreateShareOptions = {}
) {
  const normalized = normalizeDesign(design);
  const serialized = serializeDesign(normalized);
  const serializedJson = JSON.stringify(serialized);
  const title = getShareTitle(normalized);
  const description = getShareDescription(normalized);
  const shapeCount = getDesignShapes(normalized).length;
  const ownerUserId = options.ownerUserId ?? null;
  const projectId = options.projectId ?? null;
  const shareType: ShareType = ownerUserId ? "published" : "temporary";
  const expiresInDays = options.expiresInDays ?? DEFAULT_SHARE_EXPIRY_DAYS;
  const expiresAt =
    shareType === "published" ? null : toIsoDateAfterDays(expiresInDays);
  const db = await getDatabase();

  if (shareType === "published" && projectId) {
    const existing = await db
      .prepare(
        `
          select
            ${SHARE_SELECT}
          from shares
          where owner_user_id = ?
            and project_id = ?
            and share_type = 'published'
            and revoked_at is null
          order by updated_at desc
          limit 1
        `
      )
      .bind(ownerUserId, projectId)
      .first<ShareRow>();

    if (existing) {
      const now = nowIso();

      await db
        .prepare(
          `
            update shares
            set
              design_json = ?,
              title = ?,
              description = ?,
              field_width = ?,
              field_height = ?,
              shape_count = ?,
              updated_at = ?,
              expires_at = null
            where id = ?
          `
        )
        .bind(
          serializedJson,
          title,
          description,
          normalized.field.width,
          normalized.field.height,
          shapeCount,
          now,
          existing.id
        )
        .run();

      const share: StoredShare = {
        ...mapShareRow(existing),
        design: normalized,
        title,
        description,
        shapeCount,
        fieldWidth: normalized.field.width,
        fieldHeight: normalized.field.height,
        updatedAt: now,
        expiresAt: null,
        shareType: "published",
      };

      await getOrCreateGalleryEntryForShare(share);
      return share;
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = crypto.randomUUID();
    const token = createShareToken();
    const now = nowIso();

    try {
      await db
        .prepare(
          `
            insert into shares (
              id,
              token,
              design_json,
              title,
              description,
              field_width,
              field_height,
              shape_count,
              created_at,
              updated_at,
              published_at,
              expires_at,
              revoked_at,
              owner_user_id,
              project_id,
              share_type
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .bind(
          id,
          token,
          serializedJson,
          title,
          description,
          normalized.field.width,
          normalized.field.height,
          shapeCount,
          now,
          now,
          now,
          expiresAt,
          null,
          ownerUserId,
          projectId,
          shareType
        )
        .run();

      const share: StoredShare = {
        id,
        token,
        design: normalized,
        title,
        description,
        shapeCount,
        fieldWidth: normalized.field.width,
        fieldHeight: normalized.field.height,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        expiresAt,
        revokedAt: null,
        ownerUserId,
        projectId,
        shareType,
      };

      if (ownerUserId) {
        await createUnlistedGalleryEntry({
          shareToken: token,
          ownerUserId,
          title,
          description,
        });
      }

      return share;
    } catch (error) {
      if (attempt < 2 && isUniqueViolation(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to generate a unique share token");
}

export async function getOrCreateGalleryEntryForShare(share: StoredShare) {
  if (!share.ownerUserId) {
    return null;
  }

  const existing = await getGalleryEntryByShareToken(share.token);
  if (existing) {
    return existing;
  }

  return createUnlistedGalleryEntry({
    shareToken: share.token,
    ownerUserId: share.ownerUserId,
    title: share.title,
    description: share.description,
  });
}
