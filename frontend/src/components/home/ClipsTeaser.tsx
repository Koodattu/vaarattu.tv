"use client";

import Link from "next/link";
import { useCallback } from "react";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ClipCard } from "@/components/clips/ClipCard";

export function ClipsTeaser() {
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getClips(1, 3, {}, signal), []));
  return <section aria-labelledby="popular-clips">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 id="popular-clips" className="text-2xl font-bold text-white">Popular clips</h2>
      <Link href="/clips" className="inline-flex min-h-11 items-center text-sm font-medium text-purple-300 hover:text-purple-200">Browse all clips →</Link>
    </div>
    {loading ? <p role="status" className="py-6 text-gray-300">Loading clips…</p> : response?.error ? <div role="alert" className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <p className="text-gray-300">Clips couldn&apos;t be loaded.</p><button type="button" onClick={retry} className="mt-3 min-h-11 rounded-md bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">Try clips again</button>
    </div> : response?.data?.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{response.data.map(clip => <ClipCard key={clip.id} clip={clip} heading="h3" />)}</div>
      : <p className="rounded-lg border border-gray-700 p-6 text-gray-300">No clips yet. Check back after the next Twitch refresh.</p>}
  </section>;
}
