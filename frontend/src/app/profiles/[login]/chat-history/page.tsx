"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Pagination } from "@/components/Pagination";
import type { UserMessage } from "@/types/api";

const PAGE_LIMIT = 100;

export default function UserChatHistoryPage({ params }: { params: Promise<{ login: string }> }) {
  const { login } = use(params);
  return <ChatHistory key={login} login={login} />;
}

function ChatHistory({ login }: { login: string }) {
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const profileQuery = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getUserProfileByLogin(login, signal), [login]));
  const profile = profileQuery.response?.data;
  const userId = profile?.id;
  const loadMessages = useCallback((signal: AbortSignal) => apiClient.getUserMessages(userId!, page, PAGE_LIMIT, activeSearch || undefined, signal), [userId, page, activeSearch]);
  const messagesQuery = useApiQuery(userId === undefined ? null : loadMessages);
  const response = messagesQuery.response;
  const loading = profileQuery.loading || messagesQuery.loading;
  const error = profileQuery.response?.error || response?.error;

  const dayGroups = useMemo(() => {
    const groups = new Map<string, { label: string; messages: UserMessage[] }>();
    for (const message of response?.data ?? []) {
      const timestamp = new Date(message.timestamp);
      // Group using the same local calendar as the displayed dates and times.
      const key = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}`;
      if (!groups.has(key)) groups.set(key, { label: timestamp.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }), messages: [] });
      groups.get(key)!.messages.push(message);
    }
    return Array.from(groups, ([key, group]) => ({ key, ...group }));
  }, [response]);

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    if (nextSearch === activeSearch && page === 1) messagesQuery.retry();
    setActiveSearch(nextSearch);
    setPage(1);
  };
  const clearSearch = () => { setSearchInput(""); setActiveSearch(""); setPage(1); };
  const buttonClass = "min-h-11 rounded-md px-4 py-2 text-sm font-medium text-white";

  return (
    <div className="container mx-auto px-4 py-6">
      <Link href={`/profiles/${encodeURIComponent(login)}`} className="text-purple-400 hover:text-purple-300 text-sm mb-3 inline-flex min-h-11 items-center">← Back to {profile?.displayName || login}</Link>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white break-words">{profile?.displayName || login}&apos;s Chat History</h1>
          <p className="text-sm text-gray-400 mt-1" role="status">
            {loading ? "Loading messages…" : response?.pagination ? `${response.pagination.total.toLocaleString()} matching messages · newest first` : "Browse messages by date or search their content."}
          </p>
        </div>
        <form onSubmit={search} className="flex flex-wrap gap-2 lg:w-[28rem] lg:shrink-0">
          <label htmlFor="message-search" className="w-full text-sm text-gray-300">Search messages</label>
          <input id="message-search" type="search" maxLength={300} value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Words or phrases" className="min-w-0 flex-1 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-400" />
          <button type="submit" className={`${buttonClass} bg-purple-600 hover:bg-purple-700`}>Search</button>
          <button type="button" onClick={clearSearch} className={`${buttonClass} bg-gray-700 hover:bg-gray-600`}>Clear</button>
        </form>
      </div>
      {activeSearch && <p className="mb-4 text-sm text-gray-300">Results for &quot;{activeSearch}&quot;</p>}
      {error ? (
        <div role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-5">
          <p className="text-red-300">{error}</p>
          <button type="button" onClick={profileQuery.response?.error ? profileQuery.retry : messagesQuery.retry} className={`${buttonClass} mt-3 bg-gray-700 hover:bg-gray-600`}>Try again</button>
        </div>
      ) : loading ? (
        <div aria-hidden="true" className="space-y-3 rounded-lg bg-gray-800 p-5">{[1, 2, 3, 4].map(row => <div key={row} className="h-5 rounded bg-gray-700" />)}</div>
      ) : dayGroups.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center">
          <h2 className="text-lg font-semibold text-white">No messages found</h2>
          <p className="mt-2 text-gray-300">{activeSearch ? "Try another phrase or clear your search." : "Messages will appear here after this viewer chats during a stream."}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
          {dayGroups.map(group => (
            <section key={group.key} className="border-t border-gray-700 first:border-t-0">
              <h2 className="border-b border-gray-700 bg-gray-900/60 px-3 py-2 text-sm font-semibold text-gray-300">{group.label}</h2>
              <ul className="divide-y divide-gray-700/40">
                {group.messages.map(message => (
                  <li key={message.id} className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-x-2 px-3 py-1 hover:bg-gray-700/30">
                    <time dateTime={message.timestamp} className="text-xs leading-5 text-gray-400 tabular-nums whitespace-nowrap">{new Date(message.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
                    <p className="text-sm leading-5 text-gray-200 whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={response?.pagination?.totalPages ?? page} disabled={loading} onPageChange={setPage} previousLabel="Newer messages" nextLabel="Older messages" />
    </div>
  );
}
