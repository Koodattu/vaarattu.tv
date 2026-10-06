export type TimeRange = "all" | "year" | "month" | "week";

/** Rolling UTC periods; a shorter destination month ends on its final day. */
export function getDateFromRange(range: TimeRange, now = new Date()): Date | null {
  if (range === "all") return null;
  if (range === "week") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start = new Date(now);
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - (range === "year" ? 12 : 1));
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(now.getUTCDate(), lastDay));
  return start;
}
