type Database = {
  prepare(sql: string): {
    run(): Promise<{ meta?: { changes?: number }; changes?: number | bigint }>;
  };
};

/** Keep expired credential evidence briefly; never prune an active grant. */
export async function cleanupMcpOauth(db: Database) {
  const statements = [
    "DELETE FROM mcp_project_edits WHERE applied_at IS NULL AND datetime(expires_at) < datetime('now')",
    `DELETE FROM verifications WHERE datetime(expiresAt) < datetime('now', '-1 day')
      AND (CASE WHEN json_valid(value) THEN json_extract(value, '$.type') ELSE NULL END) = 'authorization_code'`,
    "DELETE FROM oauthAccessToken WHERE datetime(expiresAt) < datetime('now', '-30 days')",
    "DELETE FROM oauthRefreshToken WHERE datetime(expiresAt) < datetime('now', '-30 days')",
    "DELETE FROM oauthClientAssertion WHERE datetime(expiresAt) < datetime('now', '-1 day')",
    "DELETE FROM auth_rate_limit WHERE lastRequest < (unixepoch() - 86400) * 1000",
    "DELETE FROM mcp_oauth_request_budget WHERE window_start_ms < (unixepoch() - 86400) * 1000",
    `DELETE FROM oauthClient WHERE userId IS NULL AND datetime(createdAt) < datetime('now', '-30 days')
      AND NOT EXISTS (SELECT 1 FROM oauthConsent WHERE clientId = oauthClient.clientId)
      AND NOT EXISTS (SELECT 1 FROM oauthAccessToken WHERE clientId = oauthClient.clientId)
      AND NOT EXISTS (SELECT 1 FROM oauthRefreshToken WHERE clientId = oauthClient.clientId)`,
  ];
  let changes = 0;
  for (const sql of statements) {
    const result = await db.prepare(sql).run();
    changes += Number(result.meta?.changes ?? result.changes ?? 0);
  }
  return { meta: { changes } };
}
