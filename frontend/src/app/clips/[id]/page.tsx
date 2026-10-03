"use client";

import { Suspense, useCallback, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatStreamDate, watchHref } from "@/lib/vods";
import { ClipPlayer } from "@/components/clips/ClipPlayer";

export default function ClipPage() {
  return <Suspense fallback={<p role="status" className="p-8 text-gray-300">Loading clip…</p>}><Clip /></Suspense>;
}

function Clip() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const requestedReturn = params.get("returnTo");
  const returnTo = requestedReturn === "/clips" || requestedReturn?.startsWith("/clips?") ? requestedReturn : "/clips";
  const { response, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getClip(id, signal), [id]));
  const clip = response?.data;
  return <div className="container mx-auto max-w-5xl px-4 py-8">
    <Link href={returnTo} className="mb-5 inline-flex min-h-11 items-center text-sm text-purple-300 hover:text-purple-200">← Back to clips</Link>
    {loading ? <p role="status" className="text-gray-300">Loading clip…</p> : response?.error || !clip ? <div role="alert" className="rounded-lg border border-gray-700 p-6">
      <h1 className="text-xl font-semibold text-white">Clip unavailable</h1><p className="mt-2 text-gray-300">{response?.error || "This clip could not be loaded."}</p>
      <button type="button" onClick={retry} className="mt-4 min-h-11 rounded-md bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">Try again</button>
    </div> : <>
      <header className="mb-5">
        <h1 className="text-2xl font-bold break-words text-white sm:text-3xl">{clip.title || "Untitled clip"}</h1>
        <p className="mt-3 text-sm break-words text-gray-300">{clip.gameName || "No category"} · Clipped by {clip.creatorName}</p>
        {clip.isFeatured && <p className="mt-2 text-sm text-purple-300">Featured on Twitch</p>}
        <p className="mt-2 text-sm text-gray-400"><time dateTime={clip.createdAt}>{formatStreamDate(clip.createdAt)} Helsinki</time> · {clip.viewCount.toLocaleString()} views</p>
      </header>
      {clip.available ? <ClipPlayer key={clip.id} id={clip.id} title={clip.title} thumbnailUrl={clip.thumbnailUrl} /> : <div className="rounded-lg border border-gray-700 bg-gray-800 p-8">
        <h2 className="text-xl font-semibold text-white">This clip is no longer available on Twitch</h2>
        <p className="mt-2 text-gray-300">Its details are saved here. You can find more moments in the clips archive.</p>
      </div>}
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-t border-gray-700 pt-5">
        <ShareClip key={clip.id} id={clip.id} />
        {clip.streamId !== null && <Link href={clip.vodOffsetSeconds !== null ? watchHref(clip.streamId, clip.vodOffsetSeconds) : `/vods/${clip.streamId}`} className="inline-flex min-h-11 items-center text-sm text-purple-300 hover:text-purple-200">View source stream →</Link>}
      </div>
      <p className="mt-4 text-xs text-gray-400">Clip details updated {formatStreamDate(clip.checkedAt)} Helsinki.</p>
    </>}
  </div>;
}

function ShareClip({ id }: { id: string }) {
  const [feedback, setFeedback] = useState<{ message: string; link?: string }>();
  return <div className="min-w-0 flex-1">
    <button type="button" className="min-h-11 rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700" onClick={async () => {
      const link = new URL(`/clips/${encodeURIComponent(id)}`, window.location.origin).href;
      try { await navigator.clipboard.writeText(link); setFeedback({ message: "Clip link copied." }); }
      catch { setFeedback({ message: "Copy the clip link below.", link }); }
    }}>Copy clip link</button>
    {feedback && <p role="status" className="mt-2 text-sm text-gray-300">{feedback.message}</p>}
    {feedback?.link && <input aria-label="Clip link" readOnly value={feedback.link} onFocus={event => event.target.select()} className="mt-2 min-h-11 w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm text-white" />}
  </div>;
}
