"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Pagination } from "@/components/Pagination";

const PLATFORMS = [
  { value: undefined, label: "All Platforms" },
  { value: "twitch", label: "Twitch" },
  { value: "ffz", label: "FrankerFaceZ" },
  { value: "7tv", label: "7TV" },
  { value: "bttv", label: "BetterTTV" },
];

export default function EmotesLeaderboardPage() {
  const [platform, setPlatform] = useState<string>();
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getTopEmotes(platform, "all", page, pageSize, signal), [platform, page]));
  const emotes = response?.data ?? [];
  const error = response?.error;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/leaderboards" className="inline-flex min-h-11 items-center text-purple-400 hover:text-purple-300 mb-4">← Back to Leaderboards</Link>
      <h1 className="text-3xl font-bold text-white mb-2">Popular Emotes</h1>
      <p className="text-gray-400 mb-6">All-time usage across chat. Choose a platform to explore its emotes.</p>
      <div role="group" aria-label="Emote platform" className="flex gap-2 mb-6 flex-wrap">
        {PLATFORMS.map(option => (
          <button key={option.value || "all"} type="button" aria-pressed={platform === option.value}
            onClick={() => { setPlatform(option.value); setPage(1); }}
            className={`min-h-11 px-4 py-2 rounded-md text-sm font-medium ${platform === option.value ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
            {option.label}
          </button>
        ))}
      </div>
      {loading ? <p role="status" className="py-8 text-gray-300">Loading emotes…</p> : error ? (
        <div role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-5">
          <p className="text-red-300">{error}</p>
          <button type="button" onClick={retry} className="mt-3 min-h-11 rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">Try again</button>
        </div>
      ) : emotes.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-8">
          <h2 className="text-lg font-semibold text-white">No emote usage recorded</h2>
          <p className="mt-2 text-gray-300">Try another platform, or check back after the next stream.</p>
        </div>
      ) : (
        <ol start={(page - 1) * pageSize + 1} aria-label="Emote rankings" className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800 divide-y divide-gray-700">
          {emotes.map((emote, index) => {
            const rank = (page - 1) * pageSize + index + 1;
            return (
              <li key={emote.id} className="flex items-center gap-3 p-4">
                <span className="w-8 shrink-0 text-center text-lg font-bold">{rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}</span>
                {emote.imageUrl && <Image src={emote.imageUrl} alt="" width={40} height={40} className="object-contain" />}
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium [overflow-wrap:anywhere]">{emote.name}</div>
                  <div className="text-gray-400 text-sm">{PLATFORMS.find(option => option.value === emote.platform)?.label || emote.platform}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-white font-semibold tabular-nums">{emote.totalUsage.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm">uses</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <Pagination page={page} totalPages={response?.pagination?.totalPages ?? page} disabled={loading} onPageChange={setPage} />
    </div>
  );
}
