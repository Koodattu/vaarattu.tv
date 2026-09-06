"use client";

import { useCallback, useRef, useState } from "react";
import type { StreamDetail } from "@/types/api";
import { ChatReplay } from "./ChatReplay";
import { RecordingPlayer } from "./RecordingPlayer";

interface Selection { provider: "twitch" | "youtube"; videoId: string; offset: number; start: number; autoplay: boolean }

export function VodPlayback({ vod }: { vod: StreamDetail }) {
  const videos = vod.youtubeVideos;
  const [selection, setSelection] = useState<Selection | null>(() => {
    if (vod.twitchVideoId && vod.twitchVideoAvailable) return { provider: "twitch", videoId: vod.twitchVideoId, offset: 0, start: 0, autoplay: false };
    if (videos.length) return { provider: "youtube", videoId: videos[0].id, offset: videos[0].streamOffsetSeconds, start: 0, autoplay: false };
    return null;
  });
  const [seconds, setSeconds] = useState<number | null>(null);
  const clock = useRef(0);
  const onTime = useCallback((time: number) => { clock.current = time; setSeconds(time); }, []);
  const onEnded = useCallback(() => {
    if (selection?.provider !== "youtube") return;
    const current = videos.find((video) => video.id === selection.videoId);
    const next = videos.find((video) => video.position === (current?.position ?? 0) + 1);
    if (next) {
      setSeconds(null);
      setSelection({ provider: "youtube", videoId: next.id, offset: next.streamOffsetSeconds, start: 0, autoplay: true });
    }
  }, [selection, videos]);

  function select(value: string) {
    setSeconds(null);
    if (value === "twitch" && vod.twitchVideoId) {
      setSelection({ provider: "twitch", videoId: vod.twitchVideoId, offset: 0, start: clock.current, autoplay: false });
    } else {
      const video = videos.find((item) => item.id === value)!;
      const relativeTime = clock.current - video.streamOffsetSeconds;
      setSelection({ provider: "youtube", videoId: video.id, offset: video.streamOffsetSeconds, start: relativeTime >= 0 && relativeTime < video.durationSeconds ? relativeTime : 0, autoplay: false });
    }
  }

  return <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div className="min-w-0">
      {selection ? <>
        <label className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-300">
          Recording
          <select aria-label="Recording source and part" value={selection.provider === "twitch" ? "twitch" : selection.videoId}
            onChange={(event) => select(event.target.value)} className="min-w-0 max-w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white">
            {vod.twitchVideoId && vod.twitchVideoAvailable && <option value="twitch">Twitch</option>}
            {videos.map((video) => <option key={video.id} value={video.id}>YouTube{videos.length > 1 || video.position > 1 ? ` · Part ${video.position}` : ""} · {video.title}</option>)}
          </select>
        </label>
        <RecordingPlayer key={`${selection.provider}:${selection.videoId}:${selection.start}`} provider={selection.provider} videoId={selection.videoId}
          startSeconds={selection.start} streamOffsetSeconds={selection.offset} autoplay={selection.autoplay} onTime={onTime} onEnded={onEnded} />
      </> : <div className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center">
        <h2 className="mb-2 text-lg font-semibold text-white">Recording unavailable</h2>
        <p className="text-gray-400">There is no available recording for this stream yet.</p>
      </div>}
    </div>
    <ChatReplay key={vod.id} streamId={vod.id} seconds={seconds} totalMessages={vod.totalMessages} />
  </div>;
}
