"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LeaderboardUser, TimeRange } from "@/types/api";
import { apiClient } from "@/lib/api";

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

function PointsLeaderboardContent() {
  const searchParams = useSearchParams();
  const initialTimeRange = (searchParams.get("timeRange") as TimeRange) || "all";

  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 25;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const response = await apiClient.getTopUsers("points", timeRange, page, pageSize);

      if (response.success && response.data) {
        setUsers(response.data);
        setHasMore(response.data.length === pageSize);
      } else {
        setError(response.error || "Failed to load leaderboard");
      }

      setLoading(false);
    };

    fetchData();
  }, [timeRange, page]);

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
            <span>💎</span> Most Points Spent
          </h1>
          <p className="text-gray-400">Viewers who have spent the most channel points</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTimeRangeChange(option.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-2">Failed to load leaderboard</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Leaderboard Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {users.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400">No data for this time range</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {users.map((user, index) => {
                  const rank = (page - 1) * pageSize + index + 1;
                  return (
                    <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-gray-700/50 transition-colors">
                      <span className="w-12 text-center text-xl font-bold">{getRankBadge(rank)}</span>
                      {user.avatar && <Image src={user.avatar} alt={user.displayName} width={48} height={48} className="rounded-full" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-lg">{user.displayName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-xl">{formatNumber(user.totalPointsSpent)}</div>
                        <div className="text-gray-500 text-sm">points spent</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-6 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-6 py-2 text-gray-400">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-6 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
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

export default function PointsLeaderboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PointsLeaderboardContent />
    </Suspense>
  );
}
