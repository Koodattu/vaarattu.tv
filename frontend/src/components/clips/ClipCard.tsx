import Link from "next/link";
import type { ClipPreview } from "@/types/api";
import { formatStreamTime } from "@/lib/vods";
import { ClipThumbnail } from "./ClipThumbnail";

export function ClipCard({ clip, returnTo = "/clips", heading: Heading = "h2", eager = false }: { clip: ClipPreview; returnTo?: string; heading?: "h2" | "h3"; eager?: boolean }) {
  const context = returnTo === "/clips" ? "" : `?${new URLSearchParams({ returnTo })}`;
  return <article className="min-w-0">
    <Link href={`/clips/${encodeURIComponent(clip.id)}${context}`} className="group flex h-full flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-800 transition-colors hover:border-purple-400">
      <div className="relative aspect-video overflow-hidden bg-gray-900">
        <ClipThumbnail src={clip.thumbnailUrl} eager={eager} />
        {clip.isFeatured && <span className="absolute top-2 left-2 rounded bg-purple-950/95 px-2 py-1 text-xs font-medium text-purple-100">Featured</span>}
        <span className="absolute right-2 bottom-2 rounded bg-gray-950/95 px-2 py-1 text-xs tabular-nums text-white" aria-label={`${Math.round(clip.durationSeconds)} seconds`}>{formatStreamTime(clip.durationSeconds)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Heading className="line-clamp-2 font-semibold break-words text-white group-hover:text-purple-300">{clip.title || "Untitled clip"}</Heading>
        <p className="text-sm break-words text-gray-300">{clip.gameName || "No category"}</p>
        <p className="truncate text-xs text-gray-400">Clipped by {clip.creatorName}</p>
        <div className="mt-auto flex flex-wrap justify-between gap-x-3 gap-y-1 pt-2 text-xs text-gray-400">
          <span className="tabular-nums">{clip.viewCount.toLocaleString()} views</span>
          <time dateTime={clip.createdAt}>{new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", day: "numeric", month: "short", year: "numeric" }).format(new Date(clip.createdAt))}</time>
        </div>
      </div>
    </Link>
  </article>;
}
