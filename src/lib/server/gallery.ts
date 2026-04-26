import "server-only";

import { cache } from "react";
import { getDatabase } from "@/lib/server/db";
import { deleteGalleryPreviewImage } from "@/lib/server/gallery-media";

export const galleryStates = [
  "unlisted",
  "listed",
  "featured",
  "hidden",
] as const;

export type GalleryState = (typeof galleryStates)[number];

type GalleryEntryRow = {
  id: string;
  share_token: string;
  owner_user_id: string;
  gallery_state: string;
  gallery_title: string;
  gallery_description: string;
  gallery_preview_image: string | null;
  gallery_published_at: string | null;
  moderation_hidden_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StoredGalleryEntry = {
  id: string;
  shareToken: string;
  ownerUserId: string;
  galleryState: GalleryState;
  galleryTitle: string;
  galleryDescription: string;
  galleryPreviewImage: string | null;
  galleryPublishedAt: string | null;
  moderationHiddenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DashboardGalleryEntryRow = {
  id: string;
  share_token: string;
  owner_user_id: string;
  gallery_state: string;
  gallery_title: string;
  gallery_description: string;
  gallery_preview_image: string | null;
  gallery_published_at: string | null;
  moderation_hidden_at: string | null;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
  owner_email: string | null;
  share_title: string | null;
  share_expires_at: string | null;
  share_revoked_at: string | null;
};

export type DashboardGalleryEntry = StoredGalleryEntry & {
  ownerName: string | null;
  ownerEmail: string | null;
  shareTitle: string | null;
  shareExpiresAt: string | null;
  shareRevokedAt: string | null;
};

type PublicGalleryEntryRow = {
  id: string;
  share_token: string;
  owner_user_id: string;
  gallery_state: string;
  gallery_title: string;
  gallery_description: string;
  gallery_preview_image: string | null;
  gallery_published_at: string | null;
  moderation_hidden_at: string | null;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
  share_title: string | null;
  field_width: number | null;
  field_height: number | null;
  shape_count: number | null;
};

type GalleryStateCountRow = {
  gallery_state: string;
  count: number;
};

export type PublicGalleryEntry = StoredGalleryEntry & {
  ownerName: string | null;
  shareTitle: string | null;
  fieldWidth: number | null;
  fieldHeight: number | null;
  shapeCount: number;
};

export type GalleryOverviewStats = {
  total: number;
  listed: number;
  featured: number;
  hidden: number;
  unlisted: number;
};

type TransitionOptions = {
  retentionDays?: number;
};

const DEFAULT_SHARE_RETENTION_DAYS = 90;

function toIsoDateAfterDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function parseGalleryState(value: string | null): GalleryState {
  if (!value) return "unlisted";
  if (value === "link_only") return "unlisted";
  if (value === "gallery_visible") return "listed";

  return galleryStates.includes(value as GalleryState)
    ? (value as GalleryState)
    : "unlisted";
}

function mapGalleryEntryRow(row: GalleryEntryRow): StoredGalleryEntry {
  return {
    id: row.id,
    shareToken: row.share_token,
    ownerUserId: row.owner_user_id,
    galleryState: parseGalleryState(row.gallery_state),
    galleryTitle: row.gallery_title,
    galleryDescription: row.gallery_description,
    galleryPreviewImage: row.gallery_preview_image,
    galleryPublishedAt: row.gallery_published_at,
    moderationHiddenAt: row.moderation_hidden_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDashboardGalleryEntryRow(
  row: DashboardGalleryEntryRow
): DashboardGalleryEntry {
  return {
    ...mapGalleryEntryRow(row),
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    shareTitle: row.share_title,
    shareExpiresAt: row.share_expires_at,
    shareRevokedAt: row.share_revoked_at,
  };
}

function mapPublicGalleryEntryRow(
  row: PublicGalleryEntryRow
): PublicGalleryEntry {
  return {
    ...mapGalleryEntryRow(row),
    ownerName: row.owner_name,
    shareTitle: row.share_title,
    fieldWidth:
      row.field_width === null
        ? null
        : Number.parseFloat(String(row.field_width)),
    fieldHeight:
      row.field_height === null
        ? null
        : Number.parseFloat(String(row.field_height)),
    shapeCount: row.shape_count ?? 0,
  };
}

async function setShareExpiryState(params: {
  shareToken: string;
  expiresAt: string | null;
}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db
    .prepare(
      `
        update shares
        set expires_at = ?, updated_at = ?
        where token = ? and revoked_at is null
      `
    )
    .bind(params.expiresAt, now, params.shareToken)
    .run();
}

export async function getGalleryEntryByShareToken(shareToken: string) {
  const db = await getDatabase();
  const row = await db
    .prepare(
      `
        select
          id,
          share_token,
          owner_user_id,
          gallery_state,
          gallery_title,
          gallery_description,
          gallery_preview_image,
          gallery_published_at,
          moderation_hidden_at,
          created_at,
          updated_at
        from gallery_entries
        where share_token = ?
        limit 1
      `
    )
    .bind(shareToken)
    .first<GalleryEntryRow>();

  return row ? mapGalleryEntryRow(row) : null;
}

export async function listGalleryEntriesForDashboard(options?: {
  state?: GalleryState | "all";
}) {
  const db = await getDatabase();
  const state = options?.state ?? "all";
  const hasStateFilter = state !== "all";

  const result = await db
    .prepare(
      `
        select
          g.id,
          g.share_token,
          g.owner_user_id,
          g.gallery_state,
          g.gallery_title,
          g.gallery_description,
          g.gallery_preview_image,
          g.gallery_published_at,
          g.moderation_hidden_at,
          g.created_at,
          g.updated_at,
          u.name as owner_name,
          u.email as owner_email,
          s.title as share_title,
          s.expires_at as share_expires_at,
          s.revoked_at as share_revoked_at
        from gallery_entries g
        left join users u on u.id = g.owner_user_id
        left join shares s on s.token = g.share_token
        where (? = 0 or g.gallery_state = ?)
        order by
          case g.gallery_state
            when 'featured' then 0
            when 'listed' then 1
            when 'hidden' then 2
            else 3
          end,
          coalesce(g.gallery_published_at, g.updated_at) desc,
          g.created_at desc
      `
    )
    .bind(hasStateFilter ? 1 : 0, hasStateFilter ? state : "")
    .all<DashboardGalleryEntryRow>();

  return result.results.map(mapDashboardGalleryEntryRow);
}

export const getGalleryOverviewStats = cache(
  async function getGalleryOverviewStats(): Promise<GalleryOverviewStats> {
    const db = await getDatabase();
    const result = await db
      .prepare(
        `
        select gallery_state, count(*) as count
        from gallery_entries
        group by gallery_state
      `
      )
      .all<GalleryStateCountRow>();

    const stats: GalleryOverviewStats = {
      total: 0,
      listed: 0,
      featured: 0,
      hidden: 0,
      unlisted: 0,
    };

    for (const row of result.results) {
      const state = parseGalleryState(row.gallery_state);
      const count = Number(row.count ?? 0);

      stats[state] += count;
      stats.total += count;
    }

    return stats;
  }
);

export async function listPublicGalleryEntries(limit = 48) {
  const db = await getDatabase();
  const cappedLimit = Math.max(1, Math.min(limit, 100));
  const result = await db
    .prepare(
      `
        select
          g.id,
          g.share_token,
          g.owner_user_id,
          g.gallery_state,
          g.gallery_title,
          g.gallery_description,
          g.gallery_preview_image,
          g.gallery_published_at,
          g.moderation_hidden_at,
          g.created_at,
          g.updated_at,
          u.name as owner_name,
          s.title as share_title,
          s.field_width,
          s.field_height,
          s.shape_count
        from gallery_entries g
        inner join shares s on s.token = g.share_token
        left join users u on u.id = g.owner_user_id
        where g.gallery_state in ('listed', 'featured')
          and s.revoked_at is null
          and (s.expires_at is null or datetime(s.expires_at) > datetime('now'))
        order by
          case g.gallery_state
            when 'featured' then 0
            else 1
          end,
          coalesce(g.gallery_published_at, s.published_at, g.updated_at) desc,
          g.created_at desc
        limit ?
      `
    )
    .bind(cappedLimit)
    .all<PublicGalleryEntryRow>();

  return result.results.map(mapPublicGalleryEntryRow);
}

export async function createUnlistedGalleryEntry(params: {
  shareToken: string;
  ownerUserId: string;
  title: string;
  description: string;
}) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .prepare(
      `
        insert into gallery_entries (
          id,
          share_token,
          owner_user_id,
          gallery_state,
          gallery_title,
          gallery_description,
          gallery_preview_image,
          gallery_published_at,
          moderation_hidden_at,
          created_at,
          updated_at
        )
        values (?, ?, ?, 'unlisted', ?, ?, null, null, null, ?, ?)
      `
    )
    .bind(
      id,
      params.shareToken,
      params.ownerUserId,
      params.title,
      params.description,
      now,
      now
    )
    .run();

  return getGalleryEntryByShareToken(params.shareToken);
}

export async function moveGalleryEntryToUnlisted(
  shareToken: string,
  options: TransitionOptions & { restoreShareExpiry?: boolean } = {}
) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db
    .prepare(
      `
        update gallery_entries
        set
          gallery_state = 'unlisted',
          moderation_hidden_at = null,
          updated_at = ?
        where share_token = ?
      `
    )
    .bind(now, shareToken)
    .run();

  if (options.restoreShareExpiry !== false) {
    await setShareExpiryState({
      shareToken,
      expiresAt: toIsoDateAfterDays(
        options.retentionDays ?? DEFAULT_SHARE_RETENTION_DAYS
      ),
    });
  }
}

export async function deleteGalleryEntry(
  shareToken: string,
  options: TransitionOptions & { restoreShareExpiry?: boolean } = {}
) {
  const db = await getDatabase();
  const existing = await getGalleryEntryByShareToken(shareToken);

  if (existing?.galleryPreviewImage) {
    await deleteGalleryPreviewImage(existing.galleryPreviewImage);
  }

  await db
    .prepare(
      `
        delete from gallery_entries
        where share_token = ?
      `
    )
    .bind(shareToken)
    .run();

  if (options.restoreShareExpiry !== false) {
    await setShareExpiryState({
      shareToken,
      expiresAt: toIsoDateAfterDays(
        options.retentionDays ?? DEFAULT_SHARE_RETENTION_DAYS
      ),
    });
  }
}

export async function moveGalleryEntryToListed(shareToken: string) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db
    .prepare(
      `
        update gallery_entries
        set
          gallery_state = 'listed',
          gallery_published_at = coalesce(gallery_published_at, ?),
          moderation_hidden_at = null,
          updated_at = ?
        where share_token = ?
      `
    )
    .bind(now, now, shareToken)
    .run();

  await setShareExpiryState({
    shareToken,
    expiresAt: null,
  });
}

export async function updateGalleryEntryMetadata(params: {
  shareToken: string;
  title: string;
  description: string;
}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db
    .prepare(
      `
        update gallery_entries
        set
          gallery_title = ?,
          gallery_description = ?,
          updated_at = ?
        where share_token = ?
      `
    )
    .bind(params.title, params.description, now, params.shareToken)
    .run();
}

export async function setGalleryEntryPreviewImage(params: {
  shareToken: string;
  previewImage: string | null;
}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db
    .prepare(
      `
        update gallery_entries
        set
          gallery_preview_image = ?,
          updated_at = ?
        where share_token = ?
      `
    )
    .bind(params.previewImage, now, params.shareToken)
    .run();
}

export async function moveGalleryEntryToFeatured(shareToken: string) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db
    .prepare(
      `
        update gallery_entries
        set
          gallery_state = 'featured',
          gallery_published_at = coalesce(gallery_published_at, ?),
          moderation_hidden_at = null,
          updated_at = ?
        where share_token = ?
      `
    )
    .bind(now, now, shareToken)
    .run();

  await setShareExpiryState({
    shareToken,
    expiresAt: null,
  });
}

export async function moveGalleryEntryToHidden(
  shareToken: string,
  options: TransitionOptions = {}
) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db
    .prepare(
      `
        update gallery_entries
        set
          gallery_state = 'hidden',
          moderation_hidden_at = ?,
          updated_at = ?
        where share_token = ?
      `
    )
    .bind(now, now, shareToken)
    .run();

  await setShareExpiryState({
    shareToken,
    expiresAt: toIsoDateAfterDays(
      options.retentionDays ?? DEFAULT_SHARE_RETENTION_DAYS
    ),
  });
}
