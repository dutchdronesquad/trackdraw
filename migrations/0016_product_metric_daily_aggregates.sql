CREATE TABLE IF NOT EXISTS product_metric_measurement_state (
  metric_id TEXT PRIMARY KEY,
  contract_version TEXT NOT NULL,
  measured_since TEXT NOT NULL,
  completeness_state TEXT NOT NULL DEFAULT 'building'
    CHECK (completeness_state IN ('not_started', 'building', 'incomplete', 'complete', 'invalid')),
  last_aggregated_day TEXT,
  last_success_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_metric_daily_aggregates (
  metric_id TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  dimension TEXT NOT NULL DEFAULT '',
  window_days INTEGER NOT NULL CHECK (window_days IN (7, 28, 30)),
  numerator INTEGER NOT NULL CHECK (numerator >= 0),
  denominator INTEGER CHECK (denominator IS NULL OR denominator >= 0),
  sample_size INTEGER NOT NULL CHECK (sample_size >= 0),
  completeness_state TEXT NOT NULL
    CHECK (completeness_state IN ('complete', 'incomplete')),
  quality_status TEXT NOT NULL
    CHECK (quality_status IN ('building', 'low_volume', 'healthy', 'degraded', 'invalid')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (metric_id, day_utc, dimension)
);

CREATE INDEX IF NOT EXISTS product_metric_daily_day_idx
  ON product_metric_daily_aggregates(day_utc, metric_id);

-- This is the only account-linked derived fact. It deliberately retains no
-- browser session, project, share, feature, or event detail.
CREATE TABLE IF NOT EXISTS product_metric_creator_activations (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  activated_at TEXT NOT NULL
);

-- The first full UTC day after this migration is a conservative, factual
-- coverage boundary. Existing rows are never reinterpreted as product events.
INSERT OR IGNORE INTO product_metric_measurement_state (
  metric_id, contract_version, measured_since, completeness_state, updated_at
)
VALUES
  ('MTR-001', '1.0.0', date('now', '+1 day'), 'building', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('MTR-002', '1.0.0', date('now', '+1 day'), 'building', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('MTR-003', '1.0.0', date('now', '+1 day'), 'building', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('MTR-004', '1.0.0', date('now', '+1 day'), 'building', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('MTR-005', '1.0.0', date('now', '+1 day'), 'building', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('MTR-006', '1.0.0', date('now', '+1 day'), 'building', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('MTR-007', '1.0.0', date('now', '+1 day'), 'building', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('MTR-008', '1.0.0', date('now', '+1 day'), 'building', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('MTR-009', '1.0.0', date('now', '+1 day'), 'building', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('MTR-010', '1.0.0', date('now', '+1 day'), 'building', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
