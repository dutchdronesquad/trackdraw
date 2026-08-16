CREATE TABLE IF NOT EXISTS localization_demand_daily (
  day_utc TEXT NOT NULL,
  preferred_language TEXT NOT NULL,
  served_locale TEXT NOT NULL
    CHECK (served_locale IN ('en', 'nl', 'de', 'zh-CN')),
  country_code TEXT NOT NULL,
  creator_sessions INTEGER NOT NULL DEFAULT 0
    CHECK (creator_sessions >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (day_utc, preferred_language, served_locale, country_code)
);

CREATE INDEX IF NOT EXISTS localization_demand_daily_day_idx
  ON localization_demand_daily(day_utc DESC);

CREATE INDEX IF NOT EXISTS localization_demand_daily_language_day_idx
  ON localization_demand_daily(preferred_language, day_utc DESC);

INSERT OR IGNORE INTO product_metric_measurement_state (
  metric_id,
  contract_version,
  measured_since,
  completeness_state,
  updated_at
) VALUES (
  'L10N-001',
  'localization-demand-1.0.0',
  date('now', '+1 day'),
  'building',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
