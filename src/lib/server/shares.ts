import "server-only";

import { customAlphabet } from "nanoid";
import {
  getDesignShapes,
  normalizeDesign,
  serializeDesign,
} from "@/lib/design";
import { getShareDescription, getShareTitle } from "@/lib/share";
import type { SerializedTrackDesign, TrackDesign } from "@/lib/types";
import { createDatabaseClient } from "@/lib/server/db";

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
  field_width: number | string | null;
  field_height: number | string | null;
  shape_count: number;
  created_at: string;
  updated_at: string;
  published_at: string;
  expires_at: string;
  revoked_at: string | null;
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
};

export type StoredShareResolution =
  | { status: "available"; share: StoredShare }
  | { status: "expired"; share: StoredShare }
  | { status: "revoked"; share: StoredShare }
  | { status: "missing" };

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
  };
}

export async function resolveStoredShare(
  token: string
): Promise<StoredShareResolution> {
  const sql = await createDatabaseClient();

  try {
    const rows = await sql<ShareRow[]>`
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
        revoked_at
      from shares
      where token = ${token}
      limit 1
    `;

    const row = rows[0];
    if (!row) return { status: "missing" };

    const share = mapShareRow(row);
    if (share.revokedAt) {
      return { status: "revoked", share };
    }

    if (new Date(share.expiresAt).getTime() <= Date.now()) {
      return { status: "expired", share };
    }

    return { status: "available", share };
  } finally {
    await sql.end();
  }
}

export async function getShareByToken(token: string) {
  const resolved = await resolveStoredShare(token);
  return resolved.status === "available" ? resolved.share : null;
}

type CreateShareOptions = {
  expiresInDays?: number;
};

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
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
  const sql = await createDatabaseClient();

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const token = createShareToken();

      try {
        const rows = await sql<ShareRow[]>`
          insert into shares (
            token,
            design_json,
            title,
            description,
            field_width,
            field_height,
            shape_count,
            expires_at
          )
          values (
            ${token},
            ${serializedJson}::jsonb,
            ${title},
            ${description},
            ${normalized.field.width},
            ${normalized.field.height},
            ${shapeCount},
            now() + (${expiresInDays}::text || ' days')::interval
          )
          returning
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
            revoked_at
        `;

        return mapShareRow(rows[0]);
      } catch (error) {
        if (attempt < 2 && isUniqueViolation(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new Error("Failed to generate a unique share token");
  } finally {
    await sql.end();
  }
}
