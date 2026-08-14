CREATE TABLE IF NOT EXISTS embed_referrer_daily (
  share_token TEXT NOT NULL,
  referrer_hostname TEXT NOT NULL,
  viewed_on TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (share_token, referrer_hostname, viewed_on),
  FOREIGN KEY (share_token) REFERENCES shares(token) ON DELETE CASCADE,
  CHECK (view_count > 0)
);

CREATE INDEX IF NOT EXISTS embed_referrer_daily_viewed_on_idx
  ON embed_referrer_daily(viewed_on DESC);

CREATE INDEX IF NOT EXISTS embed_referrer_daily_share_viewed_on_idx
  ON embed_referrer_daily(share_token, viewed_on DESC);
