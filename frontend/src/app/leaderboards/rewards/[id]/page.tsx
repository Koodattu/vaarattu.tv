"use client";

import { useCallback, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { TimeRange } from "@/types/api";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Pagination } from "@/components/Pagination";
import { LeaderboardPeriod } from "@/components/leaderboards/LeaderboardControls";
import { leaderboardHref, parseLeaderboardPage, parseTimeRange } from "@/lib/leaderboards";

function getRankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function RewardDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rewardId = params.id as string;
  const timeRange = parseTimeRange(searchParams.get("timeRange"));
  const page = parseLeaderboardPage(searchParams.get("page"));
  const pageSize = 25;
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getRewardLeaderboard(rewardId, timeRange, page, pageSize, signal), [rewardId, timeRange, page]));
  const leaderboard = response?.data;
  const error = response?.error;

  const handleTimeRangeChange = (newRange: TimeRange) => {
    window.history.pushState(null, "", leaderboardHref(`/leaderboards/rewards/${encodeURIComponent(rewardId)}`, newRange));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link href={`/leaderboards/rewards?timeRange=${timeRange}`} className="text-purple-400 hover:text-purple-300 transition-colors mb-6 inline-block">
        ← Back to Rewards
      </Link>

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

      {!loading && !error && leaderboard && (
        <>
          {/* Header with reward info */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div className="flex items-start gap-4">
              {leaderboard.reward.imageUrl && <Image src={leaderboard.reward.imageUrl} alt={leaderboard.reward.title} width={64} height={64} className="rounded-lg" />}
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{leaderboard.reward.title}</h1>
                <p className="text-gray-400">{leaderboard.reward.cost.toLocaleString()} points per redemption</p>
              </div>
            </div>

            <LeaderboardPeriod value={timeRange} onChange={handleTimeRangeChange} />
          </div>

          {/* Leaderboard Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {leaderboard.users.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-400">No redemptions for this time range</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {leaderboard.users.map((user, index) => {
                  const rank = (page - 1) * pageSize + index + 1;
                  return (
                    <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-gray-700/50 transition-colors">
                      <span className="w-12 text-center text-xl font-bold">{getRankBadge(rank)}</span>
                      {user.avatar && <Image src={user.avatar} alt={user.displayName} width={48} height={48} className="rounded-full" />}
                      <div className="flex-1 min-w-0">
                        <Link href={`/profiles/${encodeURIComponent(user.login)}`} className="inline-flex min-h-11 items-center text-purple-300 font-medium text-lg hover:underline [overflow-wrap:anywhere]">{user.displayName}</Link>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-xl">{formatNumber(user.redemptionCount)}</div>
                        <div className="text-gray-500 text-sm">redemptions</div>
                      </div>
                      <div className="text-right">
                        <div className="text-purple-400 font-medium">{formatNumber(user.redemptionCount * leaderboard.reward.cost)}</div>
                        <div className="text-gray-500 text-sm">total points</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <Pagination page={page} totalPages={response?.pagination?.totalPages ?? page} disabled={loading} onPageChange={nextPage => window.history.pushState(null, "", leaderboardHref(`/leaderboards/rewards/${encodeURIComponent(rewardId)}`, timeRange, "", nextPage))} />
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

export default function RewardDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RewardDetailContent />
    </Suspense>
  );
}
