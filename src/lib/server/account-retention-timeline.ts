export function addUtcCalendarMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

// Keep full retention/response periods when scheduling removal at midnight.
export function ceilUtcDay(date: Date) {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  if (result < date) result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

export function formatAccountInactivity(activityAt: Date, now: Date) {
  let months =
    (now.getUTCFullYear() - activityAt.getUTCFullYear()) * 12 +
    now.getUTCMonth() -
    activityAt.getUTCMonth();
  if (addUtcCalendarMonths(activityAt, months) > now) months -= 1;
  return months > 0
    ? `${months} ${months === 1 ? "month" : "months"}`
    : "less than a month";
}
