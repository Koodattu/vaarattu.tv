"use client";

import { Suspense, use, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatDuration } from "@/lib/utils";
import { archiveReturnTo, firstRecordingTime, formatStreamDate, parseStreamTime, streamContext } from "@/lib/vods";
import { VodPlayback } from "@/components/vods/VodPlayback";

type Props = { params: Promise<{ id: string }> };
export default function VodWatchPage({ params }: Props) {
  return <Suspense fallback={<p role="status" className="p-8 text-gray-300">Loading stream…</p>}><Watch params={params} /></Suspense>;
}

function Watch({ params }: Props) {
  const { id } = use(params);
  const query = useSearchParams();
  const router = useRouter();
  const returnTo = archiveReturnTo(query.get("returnTo"));
  const valid = /^\d+$/.test(id) && Number(id) > 0 && Number(id) <= 2147483647;
  const load = useCallback((signal: AbortSignal) => apiClient.getStream(Number(id), signal), [id]);
  const { response, loading, retry } = useApiQuery(valid ? load : null);
  const [autoTarget, setAutoTarget] = useState<string | null>(null);
  const navigate = useCallback((href: string, autoplay = false) => {
    setAutoTarget(autoplay ? href : null);
    if (autoplay) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }, [router]);
  const vod = response?.data;
  const requested = parseStreamTime(query.get("t"));
  const seconds = requested ?? (vod ? firstRecordingTime(vod) : 0);
  const requestedSource = query.get("source");
  const source = requestedSource === "twitch" || vod?.youtubeVideos.some(video => video.id === requestedSource) ? requestedSource : null;
  const href = `/vods/${id}/watch?${query}`;
  return <div className="container mx-auto px-4 py-8">
    <Link href={`/vods/${encodeURIComponent(id)}${streamContext(returnTo)}`} className="mb-4 inline-block py-2 text-sm text-purple-300 hover:text-purple-200">← Back to VOD overview</Link>
    {loading ? <p className="py-12 text-gray-300" role="status">Loading VOD…</p>
      : !vod ? <div role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-5"><h1 className="text-xl font-semibold text-white">Stream unavailable</h1><p className="mt-2 text-gray-300">{valid ? response?.error : "Invalid stream ID."}</p>{valid && <button onClick={retry} className="mt-3 min-h-11 rounded bg-gray-800 px-4 py-2 text-white hover:bg-gray-700">Try again</button>}</div>
        : <>
          <h1 className="mb-2 max-w-4xl text-2xl font-bold break-words text-white md:text-3xl">{vod.segments[0]?.title || "Untitled stream"}</h1>
          <p className="mb-6 text-sm text-gray-300">{formatStreamDate(vod.startTime)} Helsinki · {vod.endTime ? formatDuration(vod.duration) : "Ongoing stream"}</p>
          {query.has("t") && requested === null && <p role="status" className="mb-4 text-amber-300">Invalid time in this link. Showing the start of the recording.</p>}
          {requestedSource && !source && <p role="status" className="mb-4 text-amber-300">That recording source is unavailable. Showing another recording where possible.</p>}
          <VodPlayback key={`${vod.id}:${seconds}:${source}`} vod={vod} startSeconds={seconds} source={source} returnTo={returnTo} autoplay={autoTarget === href} navigate={navigate} />
        </>}
  </div>;
}
