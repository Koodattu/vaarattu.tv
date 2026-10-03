import Link from "next/link";
import type { StreamDetail } from "@/types/api";
import { formatStreamTime, recordingAt, watchHref } from "@/lib/vods";

export function StreamChapters({ vod, returnTo = "/vods", seconds }: { vod: StreamDetail; returnTo?: string; seconds?: number }) {
  return <section aria-label="Stream chapters">
    <h2 className="mb-2 text-xl font-semibold text-white">Chapters</h2>
    <p className="mb-4 text-sm text-gray-400">Title and game changes, timed from stream start.</p>
    {!vod.segments.length ? <p className="text-gray-300">No chapters were recorded.</p> : <ol className="divide-y divide-gray-700 border-y border-gray-700">
      {vod.segments.map(segment => {
        const start = Math.max(0, (Date.parse(segment.startTime) - Date.parse(vod.startTime)) / 1000);
        const end = segment.endTime ? (Date.parse(segment.endTime) - Date.parse(vod.startTime)) / 1000 : Infinity;
        const active = seconds !== undefined && seconds >= start && seconds < end;
        const className = `grid min-h-11 grid-cols-[max-content_minmax(0,1fr)] gap-3 rounded py-3 ${active ? "bg-purple-950/40" : ""}`;
        const content = <><span className="pt-0.5 text-sm tabular-nums text-purple-300">{formatStreamTime(start)}</span><span className="min-w-0"><span className="block break-words font-medium text-white">{segment.title}</span><span className="mt-1 block text-sm text-gray-300">{segment.gameName}</span></span></>;
        return <li key={segment.id}>{recordingAt(vod, start) ? <Link className={`${className} hover:bg-gray-800`} href={watchHref(vod.id, start, returnTo)} aria-current={active ? "true" : undefined}>{content}</Link>
          : <div className={className}>{content}<span className="col-start-2 text-xs text-gray-400">No recording at this point</span></div>}</li>;
      })}
    </ol>}
  </section>;
}
