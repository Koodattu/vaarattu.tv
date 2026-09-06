"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/utils";
import type { StreamDetail } from "@/types/api";

export default function VodWatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [result, setResult] = useState<{ id: string; vod: StreamDetail | null; parent: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const streamId = Number(id);
    async function load() {
      const response = Number.isSafeInteger(streamId) && streamId > 0
        ? await apiClient.getStream(streamId)
        : null;
      if (!cancelled) setResult({ id, vod: response?.success && response.data ? response.data : null, parent: window.location.hostname });
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const loading = result?.id !== id;
  const vod = loading ? null : result?.vod;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href={`/vods/${encodeURIComponent(id)}`} className="mb-4 inline-block text-sm text-purple-400 transition-colors hover:text-purple-300">
        ← Back to VOD overview
      </Link>
      {loading ? <p className="py-12 text-center text-gray-400" role="status">Loading VOD...</p>
        : !vod ? <div className="rounded-lg border border-red-700 bg-red-900/30 p-6 text-center text-red-400">Failed to load VOD</div>
          : <>
            <h1 className="mb-2 text-2xl font-bold text-white md:text-3xl">{vod.segments[0]?.title || "Stream"}</h1>
            <p className="mb-6 text-gray-400">{formatDate(vod.startTime)} · {formatDuration(vod.duration)}</p>
            {vod.twitchVideoId ? <div className="aspect-video overflow-hidden rounded-lg bg-gray-800">
              <iframe src={`https://player.twitch.tv/?video=${encodeURIComponent(vod.twitchVideoId)}&parent=${encodeURIComponent(result!.parent)}&autoplay=false`}
                width="100%" height="100%" allowFullScreen title="VOD Player" />
            </div> : <div className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center">
              <h2 className="mb-2 text-lg font-semibold text-white">Recording unavailable</h2>
              <p className="text-gray-400">This stream’s recording is not available yet, or is no longer available on Twitch.</p>
            </div>}
          </>}
    </div>
  );
}
