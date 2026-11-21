-- Anonymous, additive counts only. No user/session/project/share identifiers.
CREATE TABLE year_number_collection (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  started_at TEXT NOT NULL
);
INSERT INTO year_number_collection VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

CREATE TABLE year_number_daily_totals (
  day_utc TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('elements', 'exports', 'sessions', 'shares', 'views', 'accounts')),
  total INTEGER NOT NULL CHECK (total >= 0),
  contributors INTEGER NOT NULL CHECK (contributors BETWEEN 0 AND 5),
  source TEXT NOT NULL CHECK (source IN ('product-events-v1', 'registration-trigger')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (day_utc, metric)
);

-- Count committed registrations, even if the account is later deleted.
-- Use database insertion time, never a supplied/backdated createdAt value.
CREATE TRIGGER year_number_account_registered AFTER INSERT ON users
WHEN NEW.role <> 'admin'
BEGIN
  INSERT INTO year_number_daily_totals (day_utc, metric, total, contributors, source, updated_at)
  VALUES (date('now'), 'accounts', 1, 1, 'registration-trigger', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ON CONFLICT(day_utc, metric) DO UPDATE SET total = total + 1, contributors = min(5, contributors + 1), updated_at = excluded.updated_at;
END;
