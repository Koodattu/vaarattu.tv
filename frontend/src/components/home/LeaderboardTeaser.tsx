"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiClient } from "@/lib/api";
import { LeaderboardSummary, LeaderboardUser } from "@/types/api";
import { formatDuration } from "@/lib/utils";

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
    <div className="bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h4>
        <Link href={href} className="text-purple-400 hover:text-purple-300 transition-colors text-xs">
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
        <p className="text-gray-500 text-sm py-4 text-center">No data yet</p>
      ) : (
        <div className="space-y-2">
          {users.map((user, index) => (
            <Link
              key={user.id}
              href={`/profiles/${user.login}`}
              className="flex items-center gap-3 py-2 border-b border-gray-600 last:border-0 hover:bg-gray-600/50 rounded px-2 -mx-2 transition-colors"
            >
              {getRankBadge(index + 1)}
              {user.avatar ? (
                <Image src={user.avatar} alt={user.displayName} width={32} height={32} className="rounded-full" />
              ) : (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 text-xs">{user.displayName[0].toUpperCase()}</div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-white font-medium truncate block">{user.displayName}</span>
              </div>
              <div className="text-right">
                <div className="text-white font-medium text-sm">{getValue(user)}</div>
                <div className="text-gray-500 text-xs">{label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function LeaderboardTeaser() {
  const [summary, setSummary] = useState<LeaderboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await apiClient.getLeaderboardSummary("all");
      if (res.success && res.data) {
        setSummary(res.data);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white">🏆 Leaderboards</h3>
        <Link href="/leaderboards" className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium">
          View all leaderboards →
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
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

      <div className="mt-6 pt-4 border-t border-gray-700 text-center">
        <Link href="/leaderboards" className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors">
          View Full Leaderboards
        </Link>
      </div>
    </div>
  );
}
