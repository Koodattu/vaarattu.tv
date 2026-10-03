"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { StreamListItem } from "@/types/api";
import { formatDuration } from "@/lib/utils";
import { formatStreamDate, streamContext } from "@/lib/vods";

/** Shared archive/home preview: identity first, then recording and community context. */
export function StreamCard({ vod, returnTo = "/vods" }: { vod: StreamListItem; returnTo?: string }) {
  const [failedImage, setFailedImage] = useState<string>();
  const thumbnail = vod.thumbnailUrl?.replace(/%?\{width\}/g, "640").replace(/%?\{height\}/g, "360");
  const games = [...new Set(vod.segments.map(segment => segment.gameName))];
  const sources = vod.recordingSources ?? [];
  return <article className="min-w-0">
    <Link href={`/vods/${vod.id}${streamContext(returnTo)}`} className="group grid h-full grid-cols-[25%_minmax(0,1fr)] overflow-hidden rounded-lg border border-gray-700 bg-gray-800 transition-colors hover:border-purple-400 sm:flex sm:flex-col">
      <div className="relative min-h-24 overflow-hidden bg-gray-900 sm:aspect-video">
        {thumbnail && thumbnail !== failedImage ? <Image src={thumbnail} alt="" fill unoptimized sizes="(max-width: 639px) 96px, (max-width: 1023px) 50vw, 33vw" className="object-cover" onError={() => setFailedImage(thumbnail)} />
          : <div className="absolute inset-0 flex items-center justify-center text-gray-400" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3Z" /></svg></div>}
        <span className="absolute bottom-2 right-2 rounded bg-gray-950/90 px-2 py-1 text-xs tabular-nums text-white">{vod.endTime ? formatDuration(vod.duration) : "Ongoing"}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        <p className="text-xs text-gray-300"><time dateTime={vod.startTime}>{formatStreamDate(vod.startTime)}</time></p>
        <h2 className="line-clamp-2 font-semibold break-words text-white group-hover:text-purple-300">{vod.segments[0]?.title || "Untitled stream"}</h2>
        <p className="line-clamp-2 text-sm text-gray-300">{games.join(" · ") || "No category recorded"}</p>
        <div className="mt-auto pt-2 text-sm">
          <p className={sources.length ? "text-purple-300" : "text-gray-400"}>{sources.length ? `Watch on ${sources.map(source => source === "twitch" ? "Twitch" : "YouTube").join(" / ")}` : "Stats only · No recording"}</p>
          <p className="mt-1 text-xs text-gray-400">{vod.totalMessages.toLocaleString()} messages · {vod.uniqueViewers.toLocaleString()} tracked in chat</p>
        </div>
      </div>
    </Link>
  </article>;
}
