"use client";

import { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserListItem } from "@/types/api";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatDuration, formatRelativeTime } from "@/lib/utils";

function ViewerCard({ user }: { user: UserListItem }) {
  return <Link href={`/profiles/${user.login}`} className="min-w-0 block rounded-lg border border-gray-700 bg-gray-800 p-4 transition-colors hover:border-purple-400">
    <div className="flex items-center gap-3">
      <div className="shrink-0">
        {user.avatar ? <Image src={user.avatar} alt="" width={48} height={48} className="rounded-full" />
          : <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-lg text-gray-300">{user.displayName[0]?.toUpperCase()}</div>}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block font-medium break-words text-white">{user.displayName}</span>
        <span className="flex flex-wrap gap-1">
          {user.isModerator && <span title="Moderator">⚔️</span>}
          {user.isVip && <span title="VIP">💎</span>}
          {user.isSubscribed && <span title="Subscriber">⭐</span>}
          {user.isFollowing && <span title="Follower">❤️</span>}
        </span>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-gray-700 pt-3 text-sm text-gray-300">
      <span>{user.totalMessages.toLocaleString()} msgs</span><span>{formatDuration(user.totalWatchTime)}</span>
    </div>
    {user.lastSeen && <p className="mt-2 text-xs text-gray-400">Last seen {formatRelativeTime(user.lastSeen)}</p>}
  </Link>;
}

export function FeaturedViewers() {
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getRandomUsers(3, signal), []));
  const viewers = response?.data ?? [];
  return <section aria-labelledby="featured-viewers">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 id="featured-viewers" className="text-2xl font-bold text-white">Featured Viewers</h2>
      <Link href="/profiles" className="inline-flex min-h-11 items-center text-sm font-medium text-purple-300 hover:text-purple-200">View All →</Link>
    </div>
    {loading ? <p role="status" className="py-6 text-gray-300">Loading viewers…</p> : response?.error ? <div role="alert" className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <p className="text-gray-300">Viewers couldn&apos;t be loaded.</p><button type="button" onClick={retry} className="mt-3 min-h-11 rounded-md bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">Try viewers again</button>
    </div> : viewers.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{viewers.map(viewer => <ViewerCard key={viewer.id} user={viewer} />)}</div>
      : <p className="rounded-lg border border-gray-700 p-6 text-gray-300">No viewers yet.</p>}
  </section>;
}
