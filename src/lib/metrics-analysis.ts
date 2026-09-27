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
  };
  exportReliability: Array<{
    format: string;
    legacy: boolean;
    successes: number;
    failures: number;
    failureRate: number | null;
  }>;
};
