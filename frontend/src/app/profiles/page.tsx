"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserListItem } from "@/types/api";
import { apiClient } from "@/lib/api";
import { formatDuration, formatRelativeTime } from "@/lib/utils";

function UserCard({ user }: { user: UserListItem }) {
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

export default function ProfilesPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const pageSize = 25;

  // Fetch random users for initial display
  const fetchRandomUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await apiClient.getRandomUsers(18);

    if (response.success && response.data) {
      setUsers(response.data);
    } else {
      setError(response.error || "Failed to load profiles");
    }

    setLoading(false);
  }, []);

  // Fetch users with search/pagination
  const fetchSearchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await apiClient.getUsers(page, pageSize, searchQuery || undefined);

    if (response.success && response.data) {
      setUsers(response.data);
      setHasMore(response.data.length === pageSize);
    } else {
      setError(response.error || "Failed to load profiles");
    }

    setLoading(false);
  }, [page, searchQuery]);

  useEffect(() => {
    if (isSearchMode) {
      fetchSearchUsers();
    } else {
      fetchRandomUsers();
    }
  }, [isSearchMode, fetchRandomUsers, fetchSearchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.length >= 3) {
      setSearchQuery(searchInput);
      setIsSearchMode(true);
      setPage(1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(e);
    }
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setIsSearchMode(false);
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Viewer Profiles</h1>
        <p className="text-gray-400">{isSearchMode ? "Search results" : "Random selection of viewers — refresh for more!"}</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search users (min 3 characters, press Enter)"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            {isSearchMode && (
              <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={searchInput.length > 0 && searchInput.length < 3}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Search
          </button>
        </form>
        {searchInput.length > 0 && searchInput.length < 3 && <p className="text-yellow-500 text-sm mt-2">Enter at least 3 characters to search</p>}
        {searchQuery && <p className="text-gray-400 text-sm mt-2">Showing results for &quot;{searchQuery}&quot;</p>}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading profiles...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-2">Failed to load profiles</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}

      {/* Users grid */}
      {!loading && !error && (
        <>
          {users.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-xl font-semibold text-white mb-2">No users found</h2>
              <p className="text-gray-400">{searchQuery ? "Try a different search term" : "No viewer profiles available yet"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}

          {/* Pagination - only in search mode */}
          {isSearchMode && users.length > 0 && (
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
          )}
        </>
      )}
    </div>
  );
}
