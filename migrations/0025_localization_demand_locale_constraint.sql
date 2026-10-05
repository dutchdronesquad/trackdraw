CREATE TABLE localization_demand_daily_new (
  day_utc TEXT NOT NULL,
  preferred_language TEXT NOT NULL,
  served_locale TEXT NOT NULL,
  country_code TEXT NOT NULL,
  creator_sessions INTEGER NOT NULL DEFAULT 0
    CHECK (creator_sessions >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (day_utc, preferred_language, served_locale, country_code)
);

INSERT INTO localization_demand_daily_new (
  day_utc,
  preferred_language,
  served_locale,
  country_code,
  creator_sessions,
  created_at,
  updated_at
)
SELECT
  day_utc,
  preferred_language,
  served_locale,
  country_code,
  creator_sessions,
  created_at,
  updated_at
FROM localization_demand_daily;

DROP TABLE localization_demand_daily;
ALTER TABLE localization_demand_daily_new RENAME TO localization_demand_daily;

CREATE INDEX localization_demand_daily_day_idx
  ON localization_demand_daily(day_utc DESC);

CREATE INDEX localization_demand_daily_language_day_idx
  ON localization_demand_daily(preferred_language, day_utc DESC);
