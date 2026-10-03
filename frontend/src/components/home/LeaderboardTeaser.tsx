"use client";

import { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiClient } from "@/lib/api";
import { LeaderboardUser } from "@/types/api";
import { formatDuration } from "@/lib/utils";
import { useApiQuery } from "@/hooks/useApiQuery";

function getRankBadge(rank: number): React.ReactNode {
  const baseClass = "w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold";
  if (rank === 1) return <span className={`${baseClass} bg-yellow-500 text-black`}>1</span>;
  if (rank === 2) return <span className={`${baseClass} bg-gray-400 text-black`}>2</span>;
  if (rank === 3) return <span className={`${baseClass} bg-amber-700 text-white`}>3</span>;
  return <span className={`${baseClass} bg-gray-600 text-white`}>{rank}</span>;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

interface LeaderboardColumnProps {
  title: string;
  icon: string;
  users: LeaderboardUser[];
  getValue: (user: LeaderboardUser) => string;
  label: string;
  href: string;
  loading: boolean;
}

function LeaderboardColumn({ title, icon, users, getValue, label, href, loading }: LeaderboardColumnProps) {
  return (
    <div className="min-w-0 bg-gray-800 rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h3>
        <Link href={href} className="inline-flex min-h-11 items-center text-purple-300 hover:text-purple-200 text-sm">
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
              <div className="w-6 h-6 bg-gray-600 rounded-full" />
              <div className="w-8 h-8 bg-gray-600 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-600 rounded w-24" />
              </div>
              <div className="h-4 bg-gray-600 rounded w-16" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No data yet</p>
      ) : (
        <div className="space-y-2">
          {users.map((user, index) => (
            <Link
              key={user.id}
              href={`/profiles/${user.login}`}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:grid-cols-[1.5rem_2rem_minmax(0,1fr)_auto] items-center gap-2 py-2 border-b border-gray-600 last:border-0 hover:bg-gray-700 rounded px-2 -mx-2 transition-colors"
            >
              {getRankBadge(index + 1)}
              {user.avatar ? (
                <Image src={user.avatar} alt="" width={32} height={32} className="hidden sm:block rounded-full" />
              ) : (
                <div aria-hidden="true" className="hidden sm:flex w-8 h-8 bg-gray-600 rounded-full items-center justify-center text-gray-200 text-xs">{user.displayName[0].toUpperCase()}</div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-white text-sm font-medium break-words block">{user.displayName}</span>
              </div>
              <div className="text-right">
                <div className="text-white font-medium text-sm">{getValue(user)}</div>
                <div className="text-gray-400 text-xs">{label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function LeaderboardTeaser() {
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getLeaderboardSummary("all", signal), []));
  const summary = response?.data;

  return (
    <section aria-labelledby="home-leaderboards">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 id="home-leaderboards" className="text-2xl font-bold text-white">Leaderboards</h2>
        <Link href="/leaderboards" className="inline-flex min-h-11 items-center text-purple-300 hover:text-purple-200 text-sm font-medium">
          View all leaderboards →
        </Link>
      </div>

      {response?.error ? <div role="alert" className="rounded-lg border border-gray-700 bg-gray-800 p-5">
        <p className="text-gray-300">Rankings couldn&apos;t be loaded.</p><button type="button" onClick={retry} className="mt-3 min-h-11 rounded-md bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">Try rankings again</button>
      </div> : <>
      {loading && <p role="status" className="sr-only">Loading rankings…</p>}
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-4">
        <LeaderboardColumn
          title="Watchtime"
          icon="⏱️"
          users={summary?.topWatchtime || []}
          getValue={(user) => formatDuration(user.totalWatchTime)}
          label="watched"
          href="/leaderboards/watchtime"
          loading={loading}
        />

        <LeaderboardColumn
          title="Messages"
          icon="💬"
          users={summary?.topMessages || []}
          getValue={(user) => formatNumber(user.totalMessages)}
          label="messages"
          href="/leaderboards/messages"
          loading={loading}
        />

        <LeaderboardColumn
          title="Points Spent"
          icon="💎"
          users={summary?.topPointsSpent || []}
          getValue={(user) => formatNumber(user.totalPointsSpent)}
          label="points"
          href="/leaderboards/points"
          loading={loading}
        />
      </div>
      </>}
    </section>
  );
}
