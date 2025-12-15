"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserListItem } from "@/types/api";
import { apiClient } from "@/lib/api";
import { formatDuration, formatRelativeTime } from "@/lib/utils";

function ViewerCard({ user }: { user: UserListItem }) {
  return (
    <Link href={`/profiles/${user.login}`} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-all hover:bg-gray-750 block">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.avatar ? (
            <Image src={user.avatar} alt={user.displayName} width={48} height={48} className="rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-lg">👤</div>
          )}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-white font-medium truncate">{user.displayName}</span>
            {/* Role badges */}
            <span className="flex gap-0.5 flex-shrink-0">
              {user.isModerator && <span title="Moderator">⚔️</span>}
              {user.isVip && <span title="VIP">💎</span>}
              {user.isSubscribed && <span title="Subscriber">⭐</span>}
              {user.isFollowing && <span title="Follower">❤️</span>}
            </span>
          </div>
          <div className="text-gray-500 text-xs truncate">@{user.login}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex justify-between mt-3 pt-3 border-t border-gray-700 text-sm">
        <span className="text-gray-400">{user.totalMessages.toLocaleString()} msgs</span>
        <span className="text-gray-500">{formatDuration(user.totalWatchTime)}</span>
      </div>

      {/* Last seen */}
      {user.lastSeen && <div className="text-gray-600 text-xs mt-2">Last seen {formatRelativeTime(user.lastSeen)}</div>}
    </Link>
  );
}

export function FeaturedViewers() {
  const [viewers, setViewers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchViewers() {
      const response = await apiClient.getRandomUsers(3);

      if (response.success && response.data) {
        setViewers(response.data);
      } else {
        setError(response.error || "Failed to load viewers");
      }

      setLoading(false);
    }

    fetchViewers();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Featured Viewers</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-700 rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-600 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-600 rounded w-24 mb-2" />
                  <div className="h-3 bg-gray-600 rounded w-16" />
                </div>
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-gray-600">
                <div className="h-3 bg-gray-600 rounded w-16" />
                <div className="h-3 bg-gray-600 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || viewers.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Featured Viewers</h2>
        <Link href="/profiles" className="text-purple-400 hover:text-purple-300 text-sm transition-colors">
          View All →
        </Link>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {viewers.map((viewer) => (
          <ViewerCard key={viewer.id} user={viewer} />
        ))}
      </div>
    </div>
  );
}
