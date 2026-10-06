"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TimeRange } from "@/types/api";
import { leaderboardHref, parseTimeRange, TIME_RANGE_OPTIONS, VIEWER_CATEGORIES } from "@/lib/leaderboards";

export function LeaderboardCategories({ current, timeRange, search = "" }: { current: string; timeRange: TimeRange; search?: string }) {
  const router = useRouter();
  const categories = [...VIEWER_CATEGORIES, { value: "rewards", label: "Rewards" }, { value: "emotes", label: "Emotes" }];
  const href = (category: string) => leaderboardHref(`/leaderboards/${category}`, timeRange, VIEWER_CATEGORIES.some(viewer => viewer.value === category) ? search : "");
  return (
    <nav aria-label="Leaderboard categories" className="mb-6 border-b border-gray-700 pb-3">
      <label className="block text-sm font-medium text-gray-300 sm:hidden">Category
        <select value={current} onChange={event => {
          const latest = new URLSearchParams(window.location.search);
          const name = VIEWER_CATEGORIES.some(category => category.value === event.target.value) ? latest.get("search")?.trim().slice(0, 300) ?? "" : "";
          router.push(leaderboardHref(`/leaderboards/${event.target.value}`, parseTimeRange(latest.get("timeRange")), name), { scroll: false });
        }} className="mt-2 min-h-11 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white">
          {categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
        </select>
      </label>
      <div className="hidden flex-wrap gap-1 sm:flex">{categories.map(category => (
        <Link key={category.value} href={href(category.value)}
          aria-current={current === category.value ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${current === category.value ? "bg-purple-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}>
          {category.label}
        </Link>
      ))}</div>
    </nav>
  );
}

export function LeaderboardPeriod({ value, onChange }: { value: TimeRange; onChange: (range: TimeRange) => void }) {
  return (
    <div role="group" aria-label="Leaderboard period" className="w-full sm:w-auto">
      <label className="block text-sm font-medium text-gray-300 sm:hidden">Period
        <select value={value} onChange={event => onChange(event.target.value as TimeRange)} className="mt-2 min-h-11 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white">
          {TIME_RANGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <div className="hidden flex-wrap gap-2 sm:flex">{TIME_RANGE_OPTIONS.map(option => (
        <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-md px-4 py-2 text-sm font-medium transition-colors ${value === option.value ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
          {option.label}
        </button>
      ))}</div>
    </div>
  );
}
