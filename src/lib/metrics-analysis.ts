// Upper bounds in seconds; the last bucket is open-ended.
export const TIME_TO_RESULT_BUCKETS = [60, 180, 300, 600, 1800, null] as const;

export type JourneyCounts = {
  started: number;
  edited: number;
  valuable: number;
  completed: number;
};

export type WeeklyProductActivity = JourneyCounts & {
  week: string;
  from: string;
  to: string;
  exports: number;
  views: number;
  embedViews: number;
  medianSeconds: number | null;
  p75Seconds: number | null;
};

export type ProductActivityAnalysis = {
  weeks: WeeklyProductActivity[];
  journey: JourneyCounts;
  timeToResult: {
    samples: number;
    medianSeconds: number | null;
    p75Seconds: number | null;
    buckets: number[];
  };
  exportReliability: Array<{
    format: string;
    legacy: boolean;
    successes: number;
    failures: number;
    failureRate: number | null;
  }>;
};
