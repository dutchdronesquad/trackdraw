-- Preserve existing anonymous totals and the registration trigger while adding a historical source.
DROP TRIGGER year_number_account_registered;
ALTER TABLE year_number_daily_totals RENAME TO year_number_daily_totals_previous;

CREATE TABLE year_number_daily_totals (
  day_utc TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('elements', 'exports', 'sessions', 'shares', 'views', 'accounts')),
  total INTEGER NOT NULL CHECK (total >= 0),
  contributors INTEGER NOT NULL CHECK (contributors BETWEEN 0 AND 5),
  source TEXT NOT NULL CHECK (source IN ('product-events-v1', 'registration-trigger', 'registration-history')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (day_utc, metric)
);

INSERT INTO year_number_daily_totals SELECT * FROM year_number_daily_totals_previous;
DROP TABLE year_number_daily_totals_previous;

-- Count committed registrations, even if the account is later deleted.
-- Use database insertion time, never a supplied/backdated createdAt value.
CREATE TRIGGER year_number_account_registered AFTER INSERT ON users
WHEN NEW.role <> 'admin'
BEGIN
  INSERT INTO year_number_daily_totals (day_utc, metric, total, contributors, source, updated_at)
  VALUES (date('now'), 'accounts', 1, 1, 'registration-trigger', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ON CONFLICT(day_utc, metric) DO UPDATE SET total = total + 1, contributors = min(5, contributors + 1), updated_at = excluded.updated_at;
END;

-- One-time anonymous lower-bound snapshot. Never overlap the trigger's complete days.
-- Exclude the partial collection-start day and current admins (original roles are unknown).
WITH RECURSIVE days(day) AS (
  SELECT max('2026-01-01', date('now', '-24 months'))
  WHERE max('2026-01-01', date('now', '-24 months')) < (SELECT date(started_at) FROM year_number_collection)
  UNION ALL
  SELECT date(day, '+1 day') FROM days
  WHERE date(day, '+1 day') < (SELECT date(started_at) FROM year_number_collection)
), counts AS (
  SELECT date(createdAt) AS day, count(*) AS total FROM users
  WHERE role <> 'admin'
    AND date(createdAt) >= max('2026-01-01', date('now', '-24 months'))
    AND date(createdAt) < (SELECT date(started_at) FROM year_number_collection)
  GROUP BY date(createdAt)
)
INSERT INTO year_number_daily_totals (day_utc, metric, total, contributors, source, updated_at)
SELECT d.day, 'accounts', coalesce(c.total, 0), min(5, coalesce(c.total, 0)),
  'registration-history', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM days d LEFT JOIN counts c ON c.day = d.day
WHERE true
ON CONFLICT(day_utc, metric) DO NOTHING;
