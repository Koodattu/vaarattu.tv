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

function RewardsLeaderboardContent() {
  const searchParams = useSearchParams();
  const initialTimeRange = (searchParams.get("timeRange") as TimeRange) || "all";

  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getTopRewards(timeRange, page, pageSize, signal), [timeRange, page]));
  const rewards = response?.data ?? [];
  const error = response?.error;

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link href="/leaderboards" className="text-purple-400 hover:text-purple-300 transition-colors mb-6 inline-block">
        ← Back to Leaderboards
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <span>🎁</span> Popular Rewards
          </h1>
          <p className="text-gray-400">Most redeemed channel point rewards</p>
        </div>

        {/* Time Range Selector */}
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
          {/* Leaderboard Grid */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {rewards.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400">No reward data available</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {rewards.map((reward, index) => {
                  const rank = (page - 1) * pageSize + index + 1;
                  return (
                    <Link
                      key={reward.id}
                      href={`/leaderboards/rewards/${reward.id}?timeRange=${timeRange}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-700/50 transition-colors"
                    >
                      <span className="w-12 text-center text-xl font-bold">{getRankBadge(rank)}</span>
                      <div className="w-12 h-12 flex items-center justify-center">
                        {reward.imageUrl && <Image src={reward.imageUrl} alt={reward.title} width={40} height={40} className="rounded" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-lg">{reward.title}</div>
                        <div className="text-gray-500 text-sm">{reward.cost.toLocaleString()} points</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-xl">{formatNumber(reward.totalRedemptions)}</div>
                        <div className="text-gray-500 text-sm">redemptions</div>
                      </div>
                      <div className="text-gray-500">→</div>
                    </Link>
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

export default function RewardsLeaderboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RewardsLeaderboardContent />
    </Suspense>
  );
}
