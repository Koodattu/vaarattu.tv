"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatDuration } from "@/lib/utils";
import { leaderboardHref, parseLeaderboardPage, parseTimeRange, VIEWER_CATEGORIES, ViewerCategory } from "@/lib/leaderboards";
import { Pagination } from "@/components/Pagination";
import { LeaderboardCategories, LeaderboardPeriod } from "./LeaderboardControls";
import { ApiResponse, TimeRange } from "@/types/api";

interface RankingRow {
  id: number;
  login: string;
  displayName: string;
  avatar: string | null;
  rank: number;
  value: number;
  detail?: string;
}

function SearchViewer({ search, onSearch }: { search: string; onSearch: (search: string) => void }) {
  const [input, setInput] = useState(search);
  return (
    <form onSubmit={event => { event.preventDefault(); onSearch(input.trim()); }} className="flex max-w-xl flex-wrap gap-2">
      <label htmlFor="ranking-viewer" className="w-full text-sm font-medium text-gray-300">Find a viewer</label>
      <input id="ranking-viewer" type="search" maxLength={300} value={input} onChange={event => setInput(event.target.value)} placeholder="Username or display name"
        className="min-h-11 min-w-0 flex-1 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-400" />
      <button type="submit" className="min-h-11 rounded-md bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700">Search</button>
      {search && <button type="button" onClick={() => onSearch("")} className="min-h-11 rounded-md bg-gray-800 px-4 py-2 text-gray-200 hover:bg-gray-700">Clear</button>}
    </form>
  );
}

export default function ViewerLeaderboard({ category }: { category: ViewerCategory }) {
  return <Suspense fallback={<p role="status" className="p-8 text-gray-300">Loading leaderboard…</p>}><ViewerLeaderboardContent category={category} /></Suspense>;
}

function ViewerLeaderboardContent({ category }: { category: ViewerCategory }) {
  const params = useSearchParams();
  const timeRange = parseTimeRange(params.get("timeRange"));
  const page = parseLeaderboardPage(params.get("page"));
  const search = params.get("search")?.trim().slice(0, 300) ?? "";
  const current = VIEWER_CATEGORIES.find(option => option.value === category)!;
  const query = useApiQuery<RankingRow[]>(useCallback(async (signal: AbortSignal): Promise<ApiResponse<RankingRow[]>> => {
    if (category === "gifts") {
      const response = await apiClient.getTopGiftedSubs(timeRange, page, 25, signal, search);
      return { ...response, data: response.data?.map(row => ({ ...row, value: row.totalGiftedSubs, detail: `${row.giftEvents.toLocaleString()} gift event${row.giftEvents === 1 ? "" : "s"}` })) };
    }
    if (category === "cheers") {
      const response = await apiClient.getTopCheers(timeRange, page, 25, signal, search);
      return { ...response, data: response.data?.map(row => ({ ...row, value: row.totalBits, detail: `${row.cheerCount.toLocaleString()} cheer${row.cheerCount === 1 ? "" : "s"}` })) };
    }
    const response = await apiClient.getTopUsers(category, timeRange, page, 25, signal, search);
    return { ...response, data: response.data?.map(row => ({ ...row, value: category === "messages" ? row.totalMessages : category === "watchtime" ? row.totalWatchTime : row.totalPointsSpent })) };
  }, [category, timeRange, page, search]));
  const { response, loading, retry } = query;
  const rows = response?.data ?? [];
  const error = response?.error;
  // Query-only transitions use Next's integrated History API, which updates the
  // URL synchronously so a quick category change cannot read the previous period.
  const navigate = (range: TimeRange, name: string, nextPage = 1) => window.history.pushState(null, "", leaderboardHref(`/leaderboards/${category}`, range, name, nextPage));
  const submit = (name: string) => name === search && page === 1 ? retry() : navigate(timeRange, name);

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href={leaderboardHref("/leaderboards", timeRange)} className="mb-4 inline-flex min-h-11 items-center text-purple-400 hover:text-purple-300">← Back to Leaderboards</Link>
      <LeaderboardCategories current={category} timeRange={timeRange} search={search} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="mb-2 text-3xl font-bold text-white">{current.title}</h1><p className="text-gray-400">{current.description}</p></div>
        <LeaderboardPeriod value={timeRange} onChange={range => navigate(range, search)} />
      </div>
      <SearchViewer key={search} search={search} onSearch={submit} />
      <div className="my-4 flex flex-wrap justify-between gap-2 text-sm text-gray-400">
        <p role="status">{loading ? "Loading leaderboard…" : error ? "Leaderboard unavailable" : `${response?.pagination?.total.toLocaleString() ?? 0} ${search ? "matching viewers" : "viewers"}`}</p>
        {search && <p>Ranks stay relative to the full leaderboard.</p>}
      </div>
      {error ? (
        <div role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-5">
          <p className="font-medium text-red-300">Failed to load leaderboard</p><p className="mt-1 text-gray-300">{error}</p>
          <button type="button" onClick={retry} className="mt-3 min-h-11 rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">Try again</button>
        </div>
      ) : loading ? (
        <div aria-hidden="true" className="space-y-2">{[1, 2, 3].map(row => <div key={row} className="h-16 rounded-md bg-gray-800" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white">{page > 1 ? "No viewers on this page" : search ? "No matching viewers" : "No activity for this period"}</h2>
          <p className="mt-2 text-gray-300">{page > 1 ? "The leaderboard may have changed. Return to the first page to continue." : search ? "Try another name, clear your search, or choose a different period." : "Choose another period or check back after a stream."}</p>
          {page > 1 && <button type="button" onClick={() => navigate(timeRange, search)} className="mt-3 min-h-11 rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">Go to first page</button>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
          <table aria-label="Viewer rankings" className="w-full table-fixed text-left">
            <thead className="border-b border-gray-700 text-xs text-gray-300"><tr>
              <th scope="col" className="w-[18%] px-2 py-3 text-center [overflow-wrap:anywhere] sm:w-20">Rank</th>
              <th scope="col" className="px-2 py-3 sm:px-4">Viewer</th>
              <th scope="col" className="w-[32%] px-2 py-3 text-right [overflow-wrap:anywhere] sm:w-44 sm:px-4">{current.label}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-700">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-700/40">
                  <td className="px-2 py-3 text-center font-semibold tabular-nums text-gray-300">{row.rank}</td>
                  <th scope="row" className="px-2 py-2 font-medium sm:px-4">
                    <Link href={`/profiles/${encodeURIComponent(row.login)}`} aria-label={row.displayName} aria-describedby={`viewer-login-${row.id}`} className="flex min-h-11 items-center gap-3 text-purple-300 hover:underline">
                      {row.avatar && <Image src={row.avatar} alt="" width={36} height={36} className="hidden shrink-0 rounded-full sm:block" />}
                      <span className="min-w-0 [overflow-wrap:anywhere]">{row.displayName}<span id={`viewer-login-${row.id}`} className="block text-xs font-normal text-gray-400">{row.login}</span></span>
                    </Link>
                  </th>
                  <td className="px-2 py-3 text-right font-semibold tabular-nums text-white [overflow-wrap:anywhere] sm:px-4">{category === "watchtime" ? formatDuration(row.value) : row.value.toLocaleString()}{row.detail && <span className="block text-xs font-normal text-gray-400">{row.detail}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={response?.pagination?.totalPages ?? page} disabled={loading} onPageChange={nextPage => navigate(timeRange, search, nextPage)} />
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-400">{category === "watchtime" ? "Watchtime is based on completed chat-presence sessions, not verified video viewing." : category === "points" ? "Points use each reward’s current cost. Past price changes are not recorded." : category === "gifts" || category === "cheers" ? "Anonymous activity is not assigned to a viewer." : "Message totals count recorded chat messages."} {timeRange === "all" && (category === "messages" || category === "watchtime" || category === "points") && "All-time totals update after streams."} Equal totals keep a stable order.</p>
    </div>
  );
}
