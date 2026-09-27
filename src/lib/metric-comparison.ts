import type { ProductMetricDailyRow } from "@/lib/server/product-metric-aggregates";

/** Low volume limits interpretation, not access to a complete observed value. */
export function hasObservedMetricValue(
  row: ProductMetricDailyRow | null
): row is ProductMetricDailyRow {
  return (
    row !== null &&
    row.completeness_state === "complete" &&
    (row.quality_status === "healthy" || row.quality_status === "low_volume")
  );
}
