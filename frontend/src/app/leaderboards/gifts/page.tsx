"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { TimeRange } from "@/types/api";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Pagination } from "@/components/Pagination";

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "year", label: "Past Year" },
  { value: "month", label: "Past Month" },
  { value: "week", label: "Past Week" },
];

function getRankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function GiftsLeaderboardContent() {
  const searchParams = useSearchParams();
  const initialTimeRange = (searchParams.get("timeRange") as TimeRange) || "all";

  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getTopGiftedSubs(timeRange, page, pageSize, signal), [timeRange, page]));
  const gifters = response?.data ?? [];
  const error = response?.error;

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/leaderboards" className="text-purple-400 hover:text-purple-300 transition-colors mb-6 inline-block">
        ← Back to Leaderboards
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <span>🎀</span> Most Gifted Subs
          </h1>
          <p className="text-gray-400">Viewers who have gifted the most channel subscriptions</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              aria-pressed={timeRange === option.value}
              onClick={() => handleTimeRangeChange(option.value)}
              className={`min-h-11 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === option.value ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading leaderboard...</span>
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-2">Failed to load leaderboard</p>
          <p className="text-gray-300 text-sm">{error}</p>
          <button type="button" onClick={retry} className="mt-3 min-h-11 rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">Try again</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {gifters.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400">No data for this time range</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {gifters.map((gifter, index) => {
                  const rank = (page - 1) * pageSize + index + 1;
                  return (
                    <div key={gifter.id} className="flex items-center gap-4 p-4 hover:bg-gray-700/50 transition-colors">
                      <span className="w-12 text-center text-xl font-bold">{getRankBadge(rank)}</span>
                      {gifter.avatar && <Image src={gifter.avatar} alt={gifter.displayName} width={48} height={48} className="rounded-full" />}
                      <div className="flex-1 min-w-0">
                        <Link href={`/profiles/${encodeURIComponent(gifter.login)}`} className="inline-flex min-h-11 items-center text-purple-300 font-medium text-lg hover:underline [overflow-wrap:anywhere]">{gifter.displayName}</Link>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-xl">{formatNumber(gifter.totalGiftedSubs)}</div>
                        <div className="text-gray-500 text-sm">{formatNumber(gifter.giftEvents)} gift event{gifter.giftEvents !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Pagination page={page} totalPages={response?.pagination?.totalPages ?? page} disabled={loading} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-3 text-gray-400">Loading...</span>
      </div>
    </div>
  );
}

export default function GiftsLeaderboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GiftsLeaderboardContent />
    </Suspense>
  );
}
