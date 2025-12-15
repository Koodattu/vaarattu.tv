"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LeaderboardEmote, TimeRange } from "@/types/api";
import { apiClient } from "@/lib/api";

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "year", label: "Past Year" },
  { value: "month", label: "Past Month" },
  { value: "week", label: "Past Week" },
];

const PLATFORM_OPTIONS = [
  { value: undefined, label: "All Platforms" },
  { value: "twitch", label: "Twitch" },
  { value: "ffz", label: "FrankerFaceZ" },
  { value: "7tv", label: "7TV" },
  { value: "bttv", label: "BetterTTV" },
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

function EmotesLeaderboardContent() {
  const searchParams = useSearchParams();
  const initialTimeRange = (searchParams.get("timeRange") as TimeRange) || "all";

  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [emotes, setEmotes] = useState<LeaderboardEmote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 25;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const response = await apiClient.getTopEmotes(platform, timeRange, page, pageSize);

      if (response.success && response.data) {
        setEmotes(response.data);
        setHasMore(response.data.length === pageSize);
      } else {
        setError(response.error || "Failed to load leaderboard");
      }

      setLoading(false);
    };

    fetchData();
  }, [timeRange, platform, page]);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setPage(1);
  };

  const handlePlatformChange = (newPlatform: string | undefined) => {
    setPlatform(newPlatform);
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
            <span>😂</span> Popular Emotes
          </h1>
          <p className="text-gray-400">Most used emotes in chat</p>
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

      {/* Platform Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {PLATFORM_OPTIONS.map((option) => (
          <button
            key={option.value || "all"}
            onClick={() => handlePlatformChange(option.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              platform === option.value ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {option.label}
          </button>
        ))}
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
          {/* Note about time range for emotes */}
          {timeRange !== "all" && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
              <p className="text-yellow-400 text-sm">
                ⚠️ Note: Emote statistics are currently only available for all time. Time range filtering will be available in a future update.
              </p>
            </div>
          )}

          {/* Leaderboard Grid */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {emotes.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400">No emote data available</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {emotes.map((emote, index) => {
                  const rank = (page - 1) * pageSize + index + 1;
                  return (
                    <div key={emote.id} className="flex items-center gap-4 p-4 hover:bg-gray-700/50 transition-colors">
                      <span className="w-12 text-center text-xl font-bold">{getRankBadge(rank)}</span>
                      <div className="w-12 h-12 flex items-center justify-center">
                        {emote.imageUrl && <Image src={emote.imageUrl} alt={emote.name} width={40} height={40} className="object-contain" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-lg">{emote.name}</div>
                        <div className="text-gray-500 text-sm capitalize">{emote.platform}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-xl">{formatNumber(emote.totalUsage)}</div>
                        <div className="text-gray-500 text-sm">uses</div>
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

export default function EmotesLeaderboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EmotesLeaderboardContent />
    </Suspense>
  );
}
