"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { StreamDetail } from "@/types/api";
import { formatStreamTime, recordingAt, watchHref } from "@/lib/vods";
import { ChatReplay } from "./ChatReplay";
import { RecordingPlayer } from "./RecordingPlayer";
import { StreamChapters } from "./StreamChapters";
import { CopyMomentLink } from "./CopyMomentLink";

export function VodPlayback({ vod, startSeconds, source, returnTo, autoplay, navigate }: {
  vod: StreamDetail; startSeconds: number; source: string | null; returnTo: string;
  autoplay: boolean; navigate: (href: string, autoplay?: boolean) => void;
}) {
  const videos = vod.youtubeVideos;
  const selection = useMemo(() => recordingAt(vod, startSeconds, source), [vod, startSeconds, source]);
  const [seconds, setSeconds] = useState<number | null>(null);
  const onTime = useCallback((time: number) => setSeconds(time), []);
  const provider = selection?.provider;
  const videoId = selection?.videoId;
  const onEnded = useCallback(() => {
    if (provider !== "youtube") return;
    const current = videos.find(video => video.id === videoId);
    const next = videos.find(video => video.position === (current?.position ?? 0) + 1);
    if (next) navigate(watchHref(vod.id, Math.max(0, next.streamOffsetSeconds), returnTo, next.id), true);
  }, [provider, videoId, videos, navigate, vod.id, returnTo]);
  const clock = seconds ?? startSeconds;
  const hasRecording = (vod.twitchVideoId && vod.twitchVideoAvailable) || videos.length > 0;
  function select(value: string) {
    const video = videos.find(item => item.id === value);
    const time = video && (clock < video.streamOffsetSeconds || clock >= video.streamOffsetSeconds + video.durationSeconds) ? Math.max(0, video.streamOffsetSeconds) : clock;
    navigate(watchHref(vod.id, time, returnTo, value));
  }
  return <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div className="min-w-0">
      {selection ? <>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <label className="min-w-0 max-w-full text-sm text-gray-300">Recording source and part
            <select value={selection.provider === "twitch" ? "twitch" : selection.videoId} onChange={event => select(event.target.value)} className="mt-2 block min-h-11 w-full max-w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white">
              {vod.twitchVideoId && vod.twitchVideoAvailable && <option value="twitch">Twitch</option>}
              {videos.map(video => <option key={video.id} value={video.id}>YouTube{videos.length > 1 || video.position > 1 ? ` · Part ${video.position}` : ""} · {formatStreamTime(Math.max(0, video.streamOffsetSeconds))}–{formatStreamTime(video.streamOffsetSeconds + video.durationSeconds)}</option>)}
            </select>
          </label>
          <p className="py-2 text-sm tabular-nums text-gray-300">Stream time <strong className="text-white">{formatStreamTime(clock)}</strong></p>
        </div>
        <RecordingPlayer key={`${selection.provider}:${selection.videoId}:${selection.start}`} provider={selection.provider} videoId={selection.videoId} startSeconds={selection.start} currentSeconds={Math.max(0, clock - selection.offset)} streamOffsetSeconds={selection.offset} autoplay={autoplay} onTime={onTime} onEnded={onEnded} />
        <div className="my-4"><CopyMomentLink href={watchHref(vod.id, clock, "/vods", selection.provider === "twitch" ? "twitch" : selection.videoId)} seconds={clock} /></div>
      </> : <div className="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-6">
        <h2 className="text-xl font-semibold text-white">{hasRecording ? "This moment is unavailable" : "Recording unavailable"}</h2>
        <p className="mt-2 text-gray-300">{hasRecording ? `The available recordings do not cover ${formatStreamTime(startSeconds)}${source ? " in this source" : ""}. Choose a recording below.` : "There is no available recording for this stream yet. Its chapters and activity are still available in the overview."}</p>
        {hasRecording && <ul className="mt-4 space-y-2">
          {vod.twitchVideoId && vod.twitchVideoAvailable && <li><Link className="inline-block min-h-11 py-2 text-purple-300 hover:text-purple-200" href={watchHref(vod.id, 0, returnTo, "twitch")}>Watch Twitch from the start</Link></li>}
          {videos.map(video => <li key={video.id}><Link className="inline-block min-h-11 py-2 text-purple-300 hover:text-purple-200" href={watchHref(vod.id, Math.max(0, video.streamOffsetSeconds), returnTo, video.id)}>Watch YouTube part {video.position} from {formatStreamTime(Math.max(0, video.streamOffsetSeconds))}</Link></li>)}
        </ul>}
      </div>}
      <div className="mt-6"><StreamChapters vod={vod} returnTo={returnTo} seconds={clock} /></div>
    </div>
    <ChatReplay key={vod.id} streamId={vod.id} seconds={seconds} totalMessages={vod.totalMessages} />
  </div>;
}
