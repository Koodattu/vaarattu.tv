import { TimeRange } from "@/types/api";

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "year", label: "Past Year" },
  { value: "month", label: "Past Month" },
  { value: "week", label: "Past Week" },
];

export const VIEWER_CATEGORIES = [
  { value: "messages", label: "Messages", title: "Most Messages", description: "Viewers who have sent the most chat messages", unit: "messages" },
  { value: "watchtime", label: "Watchtime", title: "Most Watchtime", description: "Recorded time in chat during streams", unit: "watched" },
  { value: "points", label: "Points Spent", title: "Most Points Spent", description: "Channel points spent on rewards", unit: "points" },
  { value: "gifts", label: "Gifted Subs", title: "Most Gifted Subs", description: "Gift subscriptions shared with the community", unit: "gifts" },
  { value: "cheers", label: "Bits Cheered", title: "Most Bits Cheered", description: "Bits cheered in support of the stream", unit: "bits" },
] as const;

export type ViewerCategory = typeof VIEWER_CATEGORIES[number]["value"];

export function parseTimeRange(value: string | null): TimeRange {
  return TIME_RANGE_OPTIONS.find(option => option.value === value)?.value ?? "all";
}

export function parseLeaderboardPage(value: string | null): number {
  const page = Number(value || 1);
  return Number.isSafeInteger(page) && page > 0 && page <= 1000000 ? page : 1;
}

export function leaderboardHref(path: string, timeRange: TimeRange, search = "", page = 1): string {
  const params = new URLSearchParams();
  if (timeRange !== "all") params.set("timeRange", timeRange);
  if (search) params.set("search", search);
  if (page > 1) params.set("page", String(page));
  return `${path}${params.size ? `?${params}` : ""}`;
}
