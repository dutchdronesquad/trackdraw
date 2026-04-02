import "server-only";

import { customAlphabet } from "nanoid";
import {
  getDesignShapes,
  normalizeDesign,
  serializeDesign,
} from "@/lib/track/design";
import { getShareDescription, getShareTitle } from "@/lib/share";
import type { SerializedTrackDesign, TrackDesign } from "@/lib/types";
import { getDatabase } from "@/lib/server/db";

const createShareToken = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  16
);

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
  expires_at: string;
  revoked_at: string | null;
  owner_user_id: string | null;
  project_id: string | null;
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
  expiresAt: string;
  revokedAt: string | null;
  ownerUserId: string | null;
  projectId: string | null;
};

export type StoredShareResolution =
  | { status: "available"; share: StoredShare }
  | { status: "expired"; share: StoredShare }
  | { status: "revoked"; share: StoredShare }
  | { status: "missing" };

function toIsoDateAfterDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
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
    fieldWidth:
      row.field_width === null
        ? null
        : Number.parseFloat(String(row.field_width)),
    fieldHeight:
      row.field_height === null
        ? null
        : Number.parseFloat(String(row.field_height)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    ownerUserId: row.owner_user_id,
    projectId: row.project_id,
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
          project_id
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

  if (new Date(share.expiresAt).getTime() <= Date.now()) {
    return { status: "expired", share };
  }

  return { status: "available", share };
}

export async function getShareByToken(token: string) {
  const resolved = await resolveStoredShare(token);
  return resolved.status === "available" ? resolved.share : null;
}

export async function revokeShare(token: string) {
  const db = await getDatabase();
  const now = new Date().toISOString();

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
  const expiresInDays = options.expiresInDays ?? 90;
  const ownerUserId = options.ownerUserId ?? null;
  const projectId = options.projectId ?? null;
  const db = await getDatabase();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = crypto.randomUUID();
    const token = createShareToken();
    const now = new Date().toISOString();
    const expiresAt = toIsoDateAfterDays(expiresInDays);

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
              project_id
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          projectId
        )
        .run();

      return {
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
      };
    } catch (error) {
      if (attempt < 2 && isUniqueViolation(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to generate a unique share token");
}
