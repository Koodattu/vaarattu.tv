"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LeaderboardUser,
  LeaderboardEmote,
  LeaderboardReward,
  LeaderboardSubscriptionGift,
  LeaderboardCheer,
  RewardUserLeaderboard,
  TimeRange,
} from "@/types/api";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatDuration } from "@/lib/utils";

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
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

interface LeaderboardCardProps {
  title: string;
  icon: string;
  href: string;
  children: React.ReactNode;
}

function LeaderboardCard({ title, icon, href, children }: LeaderboardCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h3>
        <Link href={href} className="text-purple-400 hover:text-purple-300 transition-colors text-sm">
          View all →
        </Link>
      </div>
      {children}
    </div>
  );
}

function UserRow({ user, rank, value, label }: { user: LeaderboardUser; rank: number; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
      <span className="w-8 text-center text-lg">{getRankBadge(rank)}</span>
      {user.avatar && <Image src={user.avatar} alt={user.displayName} width={32} height={32} className="rounded-full" />}
      <div className="flex-1 min-w-0">
        <Link href={`/profiles/${encodeURIComponent(user.login)}`} className="block truncate text-purple-300 font-medium hover:underline">{user.displayName}</Link>
      </div>
      <div className="text-right">
        <div className="text-white font-medium">{value}</div>
        <div className="text-gray-500 text-xs">{label}</div>
      </div>
    </div>
  );
}

function EmoteRow({ emote, rank }: { emote: LeaderboardEmote; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
      <span className="w-8 text-center text-lg">{getRankBadge(rank)}</span>
      {emote.imageUrl && <Image src={emote.imageUrl} alt={emote.name} width={28} height={28} className="object-contain" />}
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">{emote.name}</div>
        <div className="text-gray-500 text-xs">{emote.platform}</div>
      </div>
      <div className="text-right">
        <div className="text-white font-medium">{formatNumber(emote.totalUsage)}</div>
        <div className="text-gray-500 text-xs">uses</div>
      </div>
    </div>
  );
}

function RewardRow({ reward, rank }: { reward: LeaderboardReward; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
      <span className="w-8 text-center text-lg">{getRankBadge(rank)}</span>
      {reward.imageUrl && <Image src={reward.imageUrl} alt={reward.title} width={28} height={28} className="rounded" />}
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">{reward.title}</div>
        <div className="text-gray-500 text-xs">{reward.cost.toLocaleString()} pts</div>
      </div>
      <div className="text-right">
        <div className="text-white font-medium">{formatNumber(reward.totalRedemptions)}</div>
        <div className="text-gray-500 text-xs">redeems</div>
      </div>
    </div>
  );
}

function GiftRow({ gifter, rank }: { gifter: LeaderboardSubscriptionGift; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
      <span className="w-8 text-center text-lg">{getRankBadge(rank)}</span>
      {gifter.avatar && <Image src={gifter.avatar} alt={gifter.displayName} width={32} height={32} className="rounded-full" />}
      <div className="flex-1 min-w-0">
        <Link href={`/profiles/${encodeURIComponent(gifter.login)}`} className="block truncate text-purple-300 font-medium hover:underline">{gifter.displayName}</Link>
      </div>
      <div className="text-right">
        <div className="text-white font-medium">{formatNumber(gifter.totalGiftedSubs)}</div>
        <div className="text-gray-500 text-xs">gifts</div>
      </div>
    </div>
  );
}

function CheerRow({ cheer, rank }: { cheer: LeaderboardCheer; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
      <span className="w-8 text-center text-lg">{getRankBadge(rank)}</span>
      {cheer.avatar && <Image src={cheer.avatar} alt={cheer.displayName} width={32} height={32} className="rounded-full" />}
      <div className="flex-1 min-w-0">
        <Link href={`/profiles/${encodeURIComponent(cheer.login)}`} className="block truncate text-purple-300 font-medium hover:underline">{cheer.displayName}</Link>
      </div>
      <div className="text-right">
        <div className="text-white font-medium">{formatNumber(cheer.totalBits)}</div>
        <div className="text-gray-500 text-xs">bits</div>
      </div>
    </div>
  );
}

function RewardLeaderboardCard({ leaderboard }: { leaderboard: RewardUserLeaderboard }) {
  const { reward, users } = leaderboard;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-700">
        {reward.imageUrl && <Image src={reward.imageUrl} alt={reward.title} width={32} height={32} className="rounded" />}
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium truncate">{reward.title}</div>
          <div className="text-gray-500 text-xs">{reward.cost.toLocaleString()} pts each</div>
        </div>
      </div>
      <div className="space-y-2">
        {users.map((user, index) => (
          <div key={user.id} className="flex items-center gap-2 text-sm">
            <span className="w-6 text-center">{getRankBadge(index + 1)}</span>
            <Link href={`/profiles/${encodeURIComponent(user.login)}`} className="text-purple-300 flex-1 truncate hover:underline">{user.displayName}</Link>
            <span className="text-gray-400">{user.redemptionCount}x</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeaderboardsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getLeaderboardSummary(timeRange, signal), [timeRange]));
  const rewards = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getAllRewardLeaderboards(timeRange, signal), [timeRange]));
  const summary = response?.data;
  const error = response?.error;
  const rewardLeaderboards = rewards.response?.data ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Leaderboards</h1>
          <p className="text-gray-400">See who&apos;s at the top for messages, watchtime, and more</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex flex-wrap gap-2">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              aria-pressed={timeRange === option.value}
              onClick={() => setTimeRange(option.value)}
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
          <span className="ml-3 text-gray-400">Loading leaderboards...</span>
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-300 mb-2">Failed to load leaderboards</p>
          <p className="text-gray-300 text-sm">{error}</p>
          <button onClick={retry} className="min-h-11 mt-3 rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">Try again</button>
        </div>
      )}

      {!loading && !error && summary && (
        <>
          {/* Main Leaderboards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Top Watchtime */}
            <LeaderboardCard title="Most Watchtime" icon="⏱️" href={`/leaderboards/watchtime?timeRange=${timeRange}`}>
              {summary.topWatchtime.length === 0 ? (
                <p className="text-gray-500 text-sm">No data yet</p>
              ) : (
                summary.topWatchtime.map((user, index) => <UserRow key={user.id} user={user} rank={index + 1} value={formatDuration(user.totalWatchTime)} label="watched" />)
              )}
            </LeaderboardCard>

            {/* Top Messages */}
            <LeaderboardCard title="Most Messages" icon="💬" href={`/leaderboards/messages?timeRange=${timeRange}`}>
              {summary.topMessages.length === 0 ? (
                <p className="text-gray-500 text-sm">No data yet</p>
              ) : (
                summary.topMessages.map((user, index) => <UserRow key={user.id} user={user} rank={index + 1} value={formatNumber(user.totalMessages)} label="messages" />)
              )}
            </LeaderboardCard>

            {/* Top Points Spent */}
            <LeaderboardCard title="Most Points Spent" icon="💎" href={`/leaderboards/points?timeRange=${timeRange}`}>
              {summary.topPointsSpent.length === 0 ? (
                <p className="text-gray-500 text-sm">No data yet</p>
              ) : (
                summary.topPointsSpent.map((user, index) => <UserRow key={user.id} user={user} rank={index + 1} value={formatNumber(user.totalPointsSpent)} label="points" />)
              )}
            </LeaderboardCard>

            {/* Top Emotes */}
            <LeaderboardCard title="Popular Emotes · All Time" icon="😂" href="/leaderboards/emotes">
              {summary.topEmotes.length === 0 ? (
                <p className="text-gray-500 text-sm">No data yet</p>
              ) : (
                summary.topEmotes.map((emote, index) => <EmoteRow key={emote.id} emote={emote} rank={index + 1} />)
              )}
            </LeaderboardCard>

            {/* Top Rewards */}
            <LeaderboardCard title="Popular Rewards" icon="🎁" href={`/leaderboards/rewards?timeRange=${timeRange}`}>
              {summary.topRewards.length === 0 ? (
                <p className="text-gray-500 text-sm">No data yet</p>
              ) : (
                summary.topRewards.map((reward, index) => <RewardRow key={reward.id} reward={reward} rank={index + 1} />)
              )}
            </LeaderboardCard>

            {/* Top Gifted Subs */}
            <LeaderboardCard title="Most Gifted Subs" icon="🎀" href={`/leaderboards/gifts?timeRange=${timeRange}`}>
              {summary.topGiftedSubs.length === 0 ? (
                <p className="text-gray-500 text-sm">No data yet</p>
              ) : (
                summary.topGiftedSubs.map((gifter, index) => <GiftRow key={gifter.id} gifter={gifter} rank={index + 1} />)
              )}
            </LeaderboardCard>

            {/* Top Cheers */}
            <LeaderboardCard title="Most Bits Cheered" icon="✨" href={`/leaderboards/cheers?timeRange=${timeRange}`}>
              {summary.topCheers.length === 0 ? (
                <p className="text-gray-500 text-sm">No data yet</p>
              ) : (
                summary.topCheers.map((cheer, index) => <CheerRow key={cheer.id} cheer={cheer} rank={index + 1} />)
              )}
            </LeaderboardCard>
          </div>

        </>
      )}

      {rewards.loading && <p role="status" className="text-gray-400">Loading reward rankings…</p>}
      {rewards.response?.error && (
        <div role="alert" className="rounded-lg border border-red-700 bg-red-900/30 p-6">
          <p className="text-red-300">Unable to load reward rankings</p>
          <p className="text-gray-300 text-sm mt-2">{rewards.response.error}</p>
          <button onClick={rewards.retry} className="min-h-11 mt-3 rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">Retry rewards</button>
        </div>
      )}
      {rewardLeaderboards.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">Reward Champions</h2>
              <p className="text-gray-400 mb-6">See who&apos;s redeemed each channel point reward the most</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rewardLeaderboards.map((leaderboard) => (
                  <RewardLeaderboardCard key={leaderboard.reward.id} leaderboard={leaderboard} />
                ))}
              </div>
            </div>
      )}
    </div>
  );
}
