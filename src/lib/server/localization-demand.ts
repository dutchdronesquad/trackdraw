import { supportedLocales, type SupportedLocale } from "@/lib/i18n/locales";
import type { LocalizationDemandLanguage } from "@/lib/localization-demand";
import { getDatabase } from "@/lib/server/db";

const DISCLOSURE_THRESHOLD = 5;
const MINIMUM_HEALTHY_VOLUME = 30;
const WINDOW_DAYS = 28;

type LocalizationDemandRow = {
  preferred_language: LocalizationDemandLanguage | "unknown";
  served_locale: SupportedLocale;
  country_code: string;
  current_sessions: number;
  previous_sessions: number;
};

export type LocalizationDemandMetrics = {
  id: "L10N-001";
  windowDays: 28;
  measuredSince: string | null;
  quality: "not_started" | "building" | "low_volume" | "healthy";
  comparisonReady: boolean;
  totalCreatorSessions: number;
  unsupportedCreatorSessions: number | null;
  languages: Array<{
    language: LocalizationDemandLanguage | "unknown" | "other";
    creatorSessions: number;
    previousCreatorSessions: number;
    share: number;
    supported: boolean | null;
    countries: Array<{ country: string; creatorSessions: number }>;
  }>;
  servedLocales: Array<{
    locale: SupportedLocale;
    creatorSessions: number;
    share: number;
  }>;
};

const supportedLanguageSet = new Set<string>(
  supportedLocales.map((locale) => locale.toLowerCase().replace(/-.*/, ""))
);

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDay(date);
}

function mergeCountries(
  rows: LocalizationDemandRow[]
): Array<{ country: string; creatorSessions: number }> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(
      row.country_code,
      (totals.get(row.country_code) ?? 0) + row.current_sessions
    );
  }

  const visible: Array<{ country: string; creatorSessions: number }> = [];
  let other = 0;
  for (const [country, creatorSessions] of totals) {
    if (creatorSessions >= DISCLOSURE_THRESHOLD) {
      visible.push({ country, creatorSessions });
    } else {
      other += creatorSessions;
    }
  }
  if (other > 0) visible.push({ country: "other", creatorSessions: other });
  return visible.sort(
    (left, right) =>
      right.creatorSessions - left.creatorSessions ||
      left.country.localeCompare(right.country)
  );
}

export async function recordLocalizationDemand(input: {
  preferredLanguage: LocalizationDemandLanguage | "unknown";
  servedLocale: SupportedLocale;
  countryCode: string;
  now?: Date;
}) {
  const db = await getDatabase();
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();

  return db
    .prepare(
      `
        insert into localization_demand_daily (
          day_utc,
          preferred_language,
          served_locale,
          country_code,
          creator_sessions,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, 1, ?, ?)
        on conflict(day_utc, preferred_language, served_locale, country_code)
        do update set
          creator_sessions = creator_sessions + 1,
          updated_at = excluded.updated_at
      `
    )
    .bind(
      utcDay(now),
      input.preferredLanguage,
      input.servedLocale,
      input.countryCode,
      timestamp,
      timestamp
    )
    .run();
}

export async function getLocalizationDemandMetrics(
  now = new Date()
): Promise<LocalizationDemandMetrics> {
  const db = await getDatabase();
  const today = utcDay(now);
  const currentStart = addUtcDays(today, -WINDOW_DAYS);
  const previousStart = addUtcDays(currentStart, -WINDOW_DAYS);
  const [result, measurementState] = await Promise.all([
    db
      .prepare(
        `
        select
          preferred_language,
          served_locale,
          country_code,
          sum(case when day_utc >= ? then creator_sessions else 0 end) as current_sessions,
          sum(case when day_utc < ? then creator_sessions else 0 end) as previous_sessions
        from localization_demand_daily
        where day_utc >= ?
          and day_utc < ?
        group by preferred_language, served_locale, country_code
      `
      )
      .bind(currentStart, currentStart, previousStart, today)
      .all<LocalizationDemandRow>(),
    db
      .prepare(
        `select measured_since
         from product_metric_measurement_state
         where metric_id = 'L10N-001'
           and contract_version = 'localization-demand-1.0.0'`
      )
      .first<{ measured_since: string }>(),
  ]);

  const rows = result.results ?? [];
  const totalCreatorSessions = rows.reduce(
    (sum, row) => sum + row.current_sessions,
    0
  );
  const measuredSince = measurementState?.measured_since ?? null;
  const comparisonReady =
    measuredSince !== null && measuredSince <= previousStart;
  const quality =
    measuredSince === null
      ? "not_started"
      : measuredSince > currentStart
        ? "building"
        : totalCreatorSessions < MINIMUM_HEALTHY_VOLUME
          ? "low_volume"
          : "healthy";

  const languageRows = new Map<string, LocalizationDemandRow[]>();
  for (const row of rows) {
    const current = languageRows.get(row.preferred_language) ?? [];
    current.push(row);
    languageRows.set(row.preferred_language, current);
  }

  const visibleLanguages: LocalizationDemandMetrics["languages"] = [];
  const hiddenRows: LocalizationDemandRow[] = [];
  for (const [language, groupedRows] of languageRows) {
    const creatorSessions = groupedRows.reduce(
      (sum, row) => sum + row.current_sessions,
      0
    );
    if (creatorSessions < DISCLOSURE_THRESHOLD) {
      hiddenRows.push(...groupedRows);
      continue;
    }
    const previousCreatorSessions = groupedRows.reduce(
      (sum, row) => sum + row.previous_sessions,
      0
    );
    visibleLanguages.push({
      language: language as LocalizationDemandLanguage | "unknown",
      creatorSessions,
      previousCreatorSessions,
      share:
        totalCreatorSessions === 0 ? 0 : creatorSessions / totalCreatorSessions,
      supported:
        language === "unknown" ? null : supportedLanguageSet.has(language),
      countries: mergeCountries(groupedRows),
    });
  }
  if (hiddenRows.length > 0) {
    const creatorSessions = hiddenRows.reduce(
      (sum, row) => sum + row.current_sessions,
      0
    );
    visibleLanguages.push({
      language: "other",
      creatorSessions,
      previousCreatorSessions: hiddenRows.reduce(
        (sum, row) => sum + row.previous_sessions,
        0
      ),
      share:
        totalCreatorSessions === 0 ? 0 : creatorSessions / totalCreatorSessions,
      supported: null,
      countries: [],
    });
  }
  visibleLanguages.sort(
    (left, right) =>
      right.creatorSessions - left.creatorSessions ||
      left.language.localeCompare(right.language)
  );

  const servedLocaleTotals = new Map<SupportedLocale, number>();
  for (const row of rows) {
    servedLocaleTotals.set(
      row.served_locale,
      (servedLocaleTotals.get(row.served_locale) ?? 0) + row.current_sessions
    );
  }

  const unsupportedCreatorSessions = rows.reduce(
    (sum, row) =>
      sum +
      (row.preferred_language === "unknown" ||
      supportedLanguageSet.has(row.preferred_language)
        ? 0
        : row.current_sessions),
    0
  );

  return {
    id: "L10N-001",
    windowDays: WINDOW_DAYS,
    measuredSince,
    quality,
    comparisonReady,
    totalCreatorSessions,
    unsupportedCreatorSessions:
      unsupportedCreatorSessions >= DISCLOSURE_THRESHOLD
        ? unsupportedCreatorSessions
        : null,
    languages: visibleLanguages,
    servedLocales: supportedLocales
      .map((locale) => {
        const creatorSessions = servedLocaleTotals.get(locale) ?? 0;
        return {
          locale,
          creatorSessions,
          share:
            totalCreatorSessions === 0
              ? 0
              : creatorSessions / totalCreatorSessions,
        };
      })
      .filter((row) => row.creatorSessions > 0)
      .sort((left, right) => right.creatorSessions - left.creatorSessions),
  };
}
