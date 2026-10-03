"use client";

import { Suspense, use, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatDuration } from "@/lib/utils";
import { archiveReturnTo, firstRecordingTime, formatStreamDate, streamContext, watchHref } from "@/lib/vods";
import { StreamChapters } from "@/components/vods/StreamChapters";
import { StreamActivityChart } from "./activity-chart";

type Props = { params: Promise<{ id: string }> };

export default function VodDetailPage({ params }: Props) {
  return <Suspense fallback={<p role="status" className="p-8 text-gray-300">Loading stream…</p>}><VodDetail params={params} /></Suspense>;
}

function VodDetail({ params }: Props) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const returnTo = archiveReturnTo(searchParams.get("returnTo"));
  const valid = /^\d+$/.test(id) && Number(id) > 0 && Number(id) <= 2147483647;
  const load = useCallback((signal: AbortSignal) => apiClient.getStream(Number(id), signal), [id]);
  const { response, loading, retry } = useApiQuery(valid ? load : null);
  const vod = response?.data;
  const hasRecording = vod && (vod.twitchVideoAvailable || vod.youtubeVideos.length > 0);
  return <div className="container mx-auto px-4 py-8">
    <Link href={returnTo} className="mb-4 inline-block py-2 text-sm text-purple-300 hover:text-purple-200">← Back to VODs</Link>
    {loading ? <p role="status" className="py-12 text-gray-300">Loading stream…</p>
      : !vod ? <div role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-5"><h1 className="text-xl font-semibold text-white">Stream unavailable</h1><p className="mt-2 text-gray-300">{valid ? response?.error : "Invalid stream ID."}</p>{valid && <button type="button" onClick={retry} className="mt-3 min-h-11 rounded bg-gray-800 px-4 py-2 text-white hover:bg-gray-700">Try again</button>}</div>
        : <>
          <header className="mb-8 border-b border-gray-700 pb-6">
            <h1 className="max-w-4xl text-2xl font-bold break-words text-white md:text-3xl">{vod.segments[0]?.title || "Untitled stream"}</h1>
            <p className="mt-2 text-sm text-gray-300"><time dateTime={vod.startTime}>{formatStreamDate(vod.startTime)}</time> Helsinki · {vod.endTime ? formatDuration(vod.duration) : "Ongoing stream"}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <Link href={watchHref(vod.id, firstRecordingTime(vod), returnTo)} className="inline-flex min-h-11 items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">{hasRecording ? "Watch VOD" : "Recording details"}</Link>
                <Link href={`/vods/${vod.id}/timeline${streamContext(returnTo)}`} className="inline-flex min-h-11 items-center rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">View Timeline</Link>
              </div>
              <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-300">
                <div><dt className="inline">Messages </dt><dd className="inline font-semibold tabular-nums text-white">{vod.totalMessages.toLocaleString()}</dd></div>
                <div><dt className="inline">Tracked in chat </dt><dd className="inline font-semibold tabular-nums text-white">{vod.uniqueViewers.toLocaleString()}</dd></div>
                <div><dt className="inline">Redemptions </dt><dd className="inline font-semibold tabular-nums text-white">{vod.totalRedemptions.toLocaleString()}</dd></div>
              </dl>
            </div>
          </header>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0"><StreamActivityChart key={vod.id} vod={vod} returnTo={returnTo} /></div>
            <StreamChapters vod={vod} returnTo={returnTo} />
          </div>
        </>}
  </div>;
}
