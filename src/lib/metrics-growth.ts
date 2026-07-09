export type GrowthBucket = "day" | "week" | "month";

export type GrowthPoint = {
  period: string;
  label: string;
  users: number;
};

export type GrowthPresetRange = "3m" | "6m" | "12m" | "ytd" | "previousYear";

export type GrowthRange = GrowthPresetRange | "custom";

export type GrowthCustomRange = {
  from: string;
  to: string;
};

export type GrowthData = {
  bucket: GrowthBucket;
  from: string;
  to: string;
  userGrowth: GrowthPoint[];
  userGrowthCumulative: GrowthPoint[];
};

export type GrowthDailyPoint = {
  date: string;
  users: number;
};

export type GrowthTimeline = {
  dailyGrowth: GrowthDailyPoint[];
  totalUsers: number;
  today: string;
};

const DASHBOARD_DATE_LOCALE = "en-GB";

export function parseUtcDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function parseCalendarDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function formatCalendarDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function startOfUtcWeek(date: Date): Date {
  const start = startOfUtcDay(date);
  const day = start.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + offset);
  return start;
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addUtcWeeks(date: Date, weeks: number): Date {
  return addUtcDays(date, weeks * 7);
}

export function addUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
  );
}

export function differenceInUtcDays(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / msPerDay
  );
}

export function getCustomGrowthBucket(from: Date, to: Date): GrowthBucket {
  const days = differenceInUtcDays(from, to) + 1;
  if (days <= 45) return "day";
  if (days <= 183) return "week";
  return "month";
}

export function getGrowthBucketStart(date: Date, bucket: GrowthBucket): Date {
  if (bucket === "month") return startOfUtcMonth(date);
  if (bucket === "week") return startOfUtcWeek(date);
  return startOfUtcDay(date);
}

export function addGrowthBucket(date: Date, bucket: GrowthBucket): Date {
  if (bucket === "month") return addUtcMonths(date, 1);
  if (bucket === "week") return addUtcWeeks(date, 1);
  return addUtcDays(date, 1);
}

export function getCustomGrowthBucketStarts(
  from: Date,
  to: Date,
  bucket: GrowthBucket
): Date[] {
  const starts: Date[] = [];
  const end = getGrowthBucketStart(to, bucket);
  for (let cursor = getGrowthBucketStart(from, bucket); cursor <= end;) {
    starts.push(cursor);
    cursor = addGrowthBucket(cursor, bucket);
  }
  return starts;
}

export function formatPeriodKey(date: Date, bucket: GrowthBucket): string {
  if (bucket === "day") return formatUtcDateKey(date);
  if (bucket === "week") return formatUtcDateKey(date);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-01`;
}

export function formatGrowthLabel(date: Date, bucket: GrowthBucket): string {
  return date.toLocaleDateString(DASHBOARD_DATE_LOCALE, {
    month: "short",
    ...(bucket === "month" ? { year: "numeric" } : { day: "numeric" }),
    timeZone: "UTC",
  });
}

export function formatShortDashboardDate(value: string): string {
  return parseCalendarDateKey(value).toLocaleDateString(DASHBOARD_DATE_LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildCumulativeGrowth(
  rows: GrowthPoint[],
  priorCount: number
): GrowthPoint[] {
  let running = priorCount;
  return rows.map((row) => {
    running += row.users;
    return { ...row, users: running };
  });
}

export function buildCustomGrowthData(
  timeline: GrowthTimeline,
  range: GrowthCustomRange
): GrowthData {
  const from = parseUtcDateKey(range.from) ?? startOfUtcDay(new Date());
  const to = parseUtcDateKey(range.to) ?? from;
  const orderedFrom = from <= to ? from : to;
  const orderedTo = from <= to ? to : from;
  const bucket = getCustomGrowthBucket(orderedFrom, orderedTo);
  const bucketStarts = getCustomGrowthBucketStarts(
    orderedFrom,
    orderedTo,
    bucket
  );
  const countsByPeriod = new Map<string, number>();
  let priorCount = 0;

  for (const row of timeline.dailyGrowth) {
    const rowDate = parseUtcDateKey(row.date);
    if (!rowDate) continue;
    if (rowDate < orderedFrom) {
      priorCount += row.users;
      continue;
    }
    if (rowDate > orderedTo) continue;

    const period = formatPeriodKey(
      getGrowthBucketStart(rowDate, bucket),
      bucket
    );
    countsByPeriod.set(period, (countsByPeriod.get(period) ?? 0) + row.users);
  }

  const userGrowth = bucketStarts.map((start) => {
    const period = formatPeriodKey(start, bucket);
    return {
      period,
      label: formatGrowthLabel(start, bucket),
      users: countsByPeriod.get(period) ?? 0,
    };
  });

  return {
    bucket,
    from: formatUtcDateKey(orderedFrom),
    to: formatUtcDateKey(orderedTo),
    userGrowth,
    userGrowthCumulative: buildCumulativeGrowth(userGrowth, priorCount),
  };
}
