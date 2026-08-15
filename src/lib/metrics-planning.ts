export type PlanningDistributionRow = [number, number, number];

export type PlanningLimits = {
  projects: number;
  shares: number;
  presets: number;
};

export type ResourceLimitImpact = {
  near: number;
  above: number;
};

export type PlanLimitImpact = {
  accountsWithContent: number;
  emptyAccounts: number;
  nearAny: number;
  aboveAny: number;
  nearOrAboveAny: number;
  resources: {
    projects: ResourceLimitImpact;
    shares: ResourceLimitImpact;
    presets: ResourceLimitImpact;
  };
};

const NEAR_LIMIT_FRACTION = 0.8;

function isNearLimit(value: number, limit: number) {
  if (limit <= 0 || value <= 0 || value > limit) return false;
  return value >= Math.ceil(limit * NEAR_LIMIT_FRACTION);
}

export function calculatePlanLimitImpact(
  distribution: PlanningDistributionRow[],
  limits: PlanningLimits
): PlanLimitImpact {
  const activeRows = distribution.filter(([projects, shares, presets]) =>
    [projects, shares, presets].some((value) => value > 0)
  );
  const resourceLimits = [limits.projects, limits.shares, limits.presets];
  const resourceKeys = ["projects", "shares", "presets"] as const;
  const resources: PlanLimitImpact["resources"] = {
    projects: { near: 0, above: 0 },
    shares: { near: 0, above: 0 },
    presets: { near: 0, above: 0 },
  };
  let nearAny = 0;
  let aboveAny = 0;

  for (const row of activeRows) {
    const above = row.map((value, index) => value > resourceLimits[index]);
    const near = row.map((value, index) =>
      isNearLimit(value, resourceLimits[index])
    );

    resourceKeys.forEach((key, index) => {
      if (above[index]) resources[key].above += 1;
      if (near[index]) resources[key].near += 1;
    });

    if (above.some(Boolean)) {
      aboveAny += 1;
    } else if (near.some(Boolean)) {
      nearAny += 1;
    }
  }

  return {
    accountsWithContent: activeRows.length,
    emptyAccounts: distribution.length - activeRows.length,
    nearAny,
    aboveAny,
    nearOrAboveAny: nearAny + aboveAny,
    resources,
  };
}

export function calculateCostPerActiveCreator(
  monthlyCost: number,
  activeCreators: number
) {
  if (
    !Number.isFinite(monthlyCost) ||
    monthlyCost <= 0 ||
    !Number.isFinite(activeCreators) ||
    activeCreators <= 0
  ) {
    return null;
  }

  return monthlyCost / activeCreators;
}

export type CostCoverageEstimate = {
  expectedPaidCreators: number;
  breakEvenPerPaidCreator: number;
  costCoveringPricePerPaidCreator: number;
};

export function calculateCostCoverageEstimate(
  monthlyCost: number,
  activeCreators: number,
  paidAdoptionPct: number,
  costBufferPct: number
): CostCoverageEstimate | null {
  if (
    !Number.isFinite(monthlyCost) ||
    monthlyCost <= 0 ||
    !Number.isFinite(activeCreators) ||
    activeCreators <= 0 ||
    !Number.isFinite(paidAdoptionPct) ||
    paidAdoptionPct <= 0 ||
    paidAdoptionPct > 100 ||
    !Number.isFinite(costBufferPct) ||
    costBufferPct < 0 ||
    costBufferPct > 100
  ) {
    return null;
  }

  const expectedPaidCreators = activeCreators * (paidAdoptionPct / 100);
  const breakEvenPerPaidCreator = monthlyCost / expectedPaidCreators;

  return {
    expectedPaidCreators,
    breakEvenPerPaidCreator,
    costCoveringPricePerPaidCreator:
      breakEvenPerPaidCreator * (1 + costBufferPct / 100),
  };
}

export function calculateCreatorRange(
  activeCreators: number,
  lowerChangePct: number,
  upperChangePct: number
): [number, number] {
  const normalizedCreators = Number.isFinite(activeCreators)
    ? Math.max(0, activeCreators)
    : 0;
  const normalizedLower = Number.isFinite(lowerChangePct) ? lowerChangePct : 0;
  const normalizedUpper = Number.isFinite(upperChangePct) ? upperChangePct : 0;
  const low = Math.min(normalizedLower, normalizedUpper);
  const high = Math.max(normalizedLower, normalizedUpper);
  return [
    Math.max(0, Math.round(normalizedCreators * (1 + low / 100))),
    Math.max(0, Math.round(normalizedCreators * (1 + high / 100))),
  ];
}
