import "server-only";

import { getDatabase } from "@/lib/server/db";
export const EMBED_REFERRER_DISCLOSURE_THRESHOLD = 3;

export type EmbedReferrerSummary = {
  hostname: string;
  views: number;
};

export async function recordEmbedReferrer(
  shareToken: string,
  hostname: string
) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  return db
    .prepare(
      `
        insert into embed_referrer_daily (
          share_token,
          referrer_hostname,
          viewed_on,
          view_count,
          created_at,
          updated_at
        )
        select ?, ?, date('now'), 1, ?, ?
        from shares
        where token = ?
          and share_type = 'published'
          and revoked_at is null
          and (expires_at is null or expires_at > ?)
        on conflict(share_token, referrer_hostname, viewed_on)
        do update set
          view_count = view_count + 1,
          updated_at = excluded.updated_at
      `
    )
    .bind(shareToken, hostname, now, now, shareToken, now)
    .run();
}

export async function getEmbedReferrersByOwner(ownerUserId: string, days = 30) {
  const boundedDays = Math.max(1, Math.min(90, Math.trunc(days)));
  const db = await getDatabase();
  const rows = await db
    .prepare(
      `
        select
          r.share_token,
          r.referrer_hostname,
          sum(r.view_count) as views
        from embed_referrer_daily r
        inner join shares s on s.token = r.share_token
        where s.owner_user_id = ?
          and r.viewed_on >= date('now', ?)
        group by r.share_token, r.referrer_hostname
        having sum(r.view_count) >= ?
        order by r.share_token, views desc, r.referrer_hostname
      `
    )
    .bind(
      ownerUserId,
      `-${boundedDays - 1} days`,
      EMBED_REFERRER_DISCLOSURE_THRESHOLD
    )
    .all<{
      share_token: string;
      referrer_hostname: string;
      views: number;
    }>();

  const summaries = new Map<string, EmbedReferrerSummary[]>();
  for (const row of rows.results ?? []) {
    const current = summaries.get(row.share_token) ?? [];
    current.push({ hostname: row.referrer_hostname, views: row.views });
    summaries.set(row.share_token, current);
  }
  return summaries;
}
