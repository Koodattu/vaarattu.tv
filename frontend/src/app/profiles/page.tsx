"use client";

import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Pagination } from "@/components/Pagination";
import Image from "next/image";
import { UserListItem } from "@/types/api";
import { apiClient } from "@/lib/api";
import { formatDuration, formatRelativeTime } from "@/lib/utils";

function UserCard({ user }: { user: UserListItem }) {
  return (
    <Link href={`/profiles/${user.login}`} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors hover:bg-gray-700/50 block">
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
            <span className="text-white font-medium break-words min-w-0">{user.displayName}</span>
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
      <div className="flex flex-wrap gap-2 justify-between mt-3 pt-3 border-t border-gray-700 text-sm">
        <span className="text-gray-400">{user.totalMessages.toLocaleString()} msgs</span>
        <span className="text-gray-400">{formatDuration(user.totalWatchTime)}</span>
      </div>

      {/* Last seen */}
      {user.lastSeen && <div className="text-gray-400 text-xs mt-2">Last seen {formatRelativeTime(user.lastSeen)}</div>}
    </Link>
  );
}

export default function ProfilesPage() {
  return <Suspense fallback={<p className="p-8 text-gray-300" role="status">Loading profiles…</p>}><ProfilesContent /></Suspense>;
}

function ProfilesContent() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search")?.trim().slice(0, 300) || "";
  return <ProfileDirectory key={search} search={search} />;
}

function ProfileDirectory({ search }: { search: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPage = Number(searchParams.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 1000000 ? requestedPage : 1;
  const [searchInput, setSearchInput] = useState(search);
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => search
    ? apiClient.getUsers(page, 25, search, signal)
    : apiClient.getRandomUsers(18, signal), [page, search]));
  const users = response?.data ?? [];
  const error = response?.error;

  const navigate = (query: string, nextPage = 1) => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.push(`/profiles${params.size ? `?${params}` : ""}`, { scroll: false });
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchInput.trim();
    if (query === search && page === 1) retry();
    else navigate(query);
  };
  const buttonClass = "min-h-11 rounded-md px-4 py-2 font-medium text-white";
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Viewer Profiles</h1>
          <p className="text-gray-400">{search ? `Results for “${search}”` : "Meet the community or find a viewer by name."}</p>
        </div>
        {!search && <button type="button" onClick={retry} disabled={loading} className={`${buttonClass} bg-gray-800 hover:bg-gray-700 disabled:opacity-50`}>Refresh selection</button>}
      </div>
      <form onSubmit={submit} className="mb-6 flex max-w-xl flex-wrap gap-2">
        <label htmlFor="viewer-search" className="w-full text-sm text-gray-300">Search viewers</label>
        <input id="viewer-search" type="search" maxLength={300} value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Username or display name" className="min-w-0 flex-1 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-400" />
        <button type="submit" className={`${buttonClass} bg-purple-600 hover:bg-purple-700`}>Search</button>
        {search && <button type="button" onClick={() => navigate("")} className={`${buttonClass} bg-gray-700 hover:bg-gray-600`}>Clear</button>}
      </form>
      <p role="status" className="mb-4 text-sm text-gray-400">{loading ? "Loading profiles…" : response?.pagination ? `${response.pagination.total.toLocaleString()} viewers found` : "A selection of active viewers"}</p>
      {error ? (
        <div role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-5">
          <p className="text-red-300">{error}</p>
          <button type="button" onClick={retry} className={`${buttonClass} mt-3 bg-gray-700 hover:bg-gray-600`}>Try again</button>
        </div>
      ) : loading ? (
        <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(row => <div key={row} className="h-32 rounded-lg bg-gray-800" />)}</div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">No viewers found</h2>
          <p className="text-gray-300">{search ? "Try another name or clear your search." : "Active viewer profiles will appear as the community chats."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4">
          {users.map(user => <UserCard key={user.id} user={user} />)}
        </div>
      )}
      {search && <Pagination page={page} totalPages={response?.pagination?.totalPages ?? page} disabled={loading} onPageChange={nextPage => navigate(search, nextPage)} />}
    </div>
  );
}
