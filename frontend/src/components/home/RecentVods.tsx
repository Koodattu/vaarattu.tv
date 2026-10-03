"use client";

import { useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { StreamCard } from "@/components/vods/StreamCard";

export function RecentVods() {
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getStreams(1, 3, {}, signal), []));
  return <div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-bold text-white">Recent VODs</h2>
      <Link href="/vods" className="py-2 text-sm font-medium text-purple-300 hover:text-purple-200">Browse all streams →</Link>
    </div>
    {loading ? <p role="status" className="py-8 text-gray-300">Loading streams…</p>
      : response?.error ? <div role="alert" className="py-6 text-gray-300"><p>{response.error}</p><button type="button" onClick={retry} className="mt-2 min-h-11 text-purple-300 hover:text-purple-200">Try again</button></div>
        : !response?.data?.length ? <p className="py-8 text-gray-300">Streams will appear here as they are recorded.</p>
          : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{response.data.map(vod => <StreamCard key={vod.id} vod={vod} />)}</div>}
  </div>;
}
