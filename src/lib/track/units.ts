export const m2px = (m: number, ppm: number) => m * ppm;
export const px2m = (px: number, ppm: number) => px / ppm;

export type MeasurementUnitSystem = "metric" | "imperial";

export const MEASUREMENT_STORAGE_KEY = "trackdraw.measurementUnitSystem";

const FEET_PER_METER = 3.280839895;
const METERS_PER_FOOT = 1 / FEET_PER_METER;
const METERS_PER_INCH = METERS_PER_FOOT / 12;

const IMPERIAL_LOCALES = new Set(["US", "LR", "MM"]);

export function normalizeMeasurementUnitSystem(
  value: unknown
): MeasurementUnitSystem | null {
  return value === "metric" || value === "imperial" ? value : null;
}

export function getMeasurementUnitSystemFromLocales(
  locales: readonly string[] | undefined
): MeasurementUnitSystem {
  const firstRegion = locales
    ?.map((locale) => {
      try {
        return new Intl.Locale(locale).region?.toUpperCase() ?? null;
      } catch {
        const match = locale.match(/[-_]([A-Za-z]{2})\b/);
        return match?.[1]?.toUpperCase() ?? null;
      }
    })
    .find((region): region is string => Boolean(region));

  return firstRegion && IMPERIAL_LOCALES.has(firstRegion)
    ? "imperial"
    : "metric";
}

export function metersToFeet(meters: number) {
  return meters * FEET_PER_METER;
}

export function feetToMeters(feet: number) {
  return feet * METERS_PER_FOOT;
}

export function inchesToMeters(inches: number) {
  return inches * METERS_PER_INCH;
}

function trimNumber(value: number, digits: number) {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(digits)).toString();
}

export function formatMeasurement(
  meters: number,
  unitSystem: MeasurementUnitSystem = "metric",
  options: { precision?: number } = {}
) {
  const precision = options.precision ?? (Math.abs(meters) < 10 ? 1 : 0);

  if (unitSystem === "imperial") {
    return `${trimNumber(metersToFeet(meters), precision)} ft`;
  }

  return `${trimNumber(meters, precision)} m`;
}

export function formatFieldSize(
  widthMeters: number,
  heightMeters: number,
  unitSystem: MeasurementUnitSystem = "metric"
) {
  if (unitSystem === "imperial") {
    return `${trimNumber(metersToFeet(widthMeters), 0)} x ${trimNumber(
      metersToFeet(heightMeters),
      0
    )} ft`;
  }

  return `${trimNumber(widthMeters, 1)} x ${trimNumber(heightMeters, 1)} m`;
}

export function formatCompactFieldSize(
  widthMeters: number,
  heightMeters: number,
  unitSystem: MeasurementUnitSystem = "metric"
) {
  if (unitSystem === "imperial") {
    return `${trimNumber(metersToFeet(widthMeters), 0)}×${trimNumber(
      metersToFeet(heightMeters),
      0
    )} ft`;
  }

  return `${trimNumber(widthMeters, 1)}×${trimNumber(heightMeters, 1)} m`;
}

export function formatMeasurementInputValue(
  meters: number,
  unitSystem: MeasurementUnitSystem
) {
  const value = unitSystem === "imperial" ? metersToFeet(meters) : meters;
  return trimNumber(value, Math.abs(value) < 10 ? 2 : 1);
}

export function parseMeasurementInput(
  value: string,
  fallbackUnitSystem: MeasurementUnitSystem = "metric"
) {
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/^(-?\d+(?:[.,]\d+)?)\s*([a-z"']*)$/);
  if (!match) return null;

  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount)) return null;

  const unit = match[2];
  if (unit === "m" || unit === "meter" || unit === "meters") {
    return amount;
  }
  if (unit === "ft" || unit === "foot" || unit === "feet" || unit === "'") {
    return feetToMeters(amount);
  }
  if (unit === "in" || unit === "inch" || unit === "inches" || unit === '"') {
    return inchesToMeters(amount);
  }

  if (unit) return null;

  return fallbackUnitSystem === "imperial" ? feetToMeters(amount) : amount;
}
