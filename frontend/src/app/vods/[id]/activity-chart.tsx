"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatStreamDate, formatStreamTime, parseStreamTime, recordingAt, watchHref } from "@/lib/vods";
import { CopyMomentLink } from "@/components/vods/CopyMomentLink";
import type { StreamDetail } from "@/types/api";

const number = (value: number | null) => value === null ? "Not recorded" : value.toLocaleString("en-GB", { maximumFractionDigits: 1 });
const plot = { left: 42, right: 12, top: 18, bottom: 32, height: 224 };

export function StreamActivityChart({ vod, returnTo }: { vod: StreamDetail; returnTo: string }) {
  const params = useSearchParams();
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [showTable, setShowTable] = useState(false);
  const { response, lastSuccessfulResponse, loading, retry } = useApiQuery(useCallback((signal: AbortSignal) => apiClient.getStreamActivity(vod.id, signal), [vod.id]));
  const activity = response?.success ? response.data : lastSuccessfulResponse?.data;
  const points = activity?.points ?? [];
  const hasPoints = points.length > 0;
  const metrics = {
    messages: { field: "messagesPerMinute", label: "Messages / min", unit: "messages / min", description: "Captured messages per minute, averaged over each interval." },
    viewers: { field: "viewers", label: activity?.viewerSource === "twitch" ? "Twitch viewers" : "Chat presence", unit: "people", description: activity?.viewerSource === "twitch" ? "Highest Twitch audience sample in each interval. Gaps mean no sample was recorded." : "Peak tracked chat presence per interval. Twitch audience counts were not collected." },
    chatters: { field: "activeChatters", label: "Active chatters", unit: "people", description: "Most distinct people sending a message in one minute within each interval." },
  } as const;
  const requestedMetric = params.get("metric");
  const metric = requestedMetric === "viewers" || requestedMetric === "chatters" ? requestedMetric : "messages";
  const chosen = metrics[metric];
  const start = Date.parse(vod.startTime);
  const end = Date.parse(points.at(-1)?.endTime || vod.startTime);
  const elapsed = (value: string) => Math.max(0, (Date.parse(value) - start) / 1000);
  const requestedTime = parseStreamTime(params.get("at")) ?? 0;
  const selectedIndex = Math.max(0, points.findLastIndex(point => elapsed(point.time) <= requestedTime));
  const selected = points[selectedIndex];
  const selectedTime = selected ? elapsed(selected.time) : 0;
  const values = points.map(point => point[chosen.field]).filter(value => value !== null);
  const peak = values.length ? Math.max(...values) : null;
  const peakIndex = peak === null ? 0 : points.findIndex(point => point[chosen.field] === peak);
  const maximum = Math.max(1, Math.ceil(peak ?? 0));
  const x = (value: string) => plot.left + (Date.parse(value) - start) / Math.max(1, end - start) * (width - plot.left - plot.right);
  const y = (value: number) => plot.top + (1 - value / maximum) * (plot.height - plot.top - plot.bottom);
  const line = points.map((point, index) => {
    const value = point[chosen.field];
    if (value === null) return "";
    const drawing = index > 0 && points[index - 1][chosen.field] !== null;
    const path = `${drawing ? "L" : "M"} ${x(point.time)} ${y(value)} L ${x(point.endTime)} ${y(value)}`;
    return path;
  }).join(" ");
  const ticks = width < 500 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  const button = "min-h-11 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40";

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(200, Math.floor(entries[0].contentRect.width))));
    observer.observe(root);
    return () => observer.disconnect();
  }, [hasPoints]);

  function selectInterval(index: number) {
    const next = new URLSearchParams(window.location.search);
    const time = elapsed(points[index].time);
    if (time) next.set("at", String(Math.floor(time))); else next.delete("at");
    // These controls only select already-loaded data. Avoid racing server navigations.
    window.history.replaceState(null, "", `/vods/${vod.id}${next.size ? `?${next}` : ""}`);
  }
  const share = new URLSearchParams({ metric, at: String(Math.floor(selectedTime)) });
  return <section aria-labelledby={`${id}-heading`} className="min-w-0 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id={`${id}-heading`} className="text-xl font-semibold text-white">Activity over time</h2><p className="mt-1 text-sm text-gray-400">{activity ? `${activity.intervalMinutes}-minute intervals · Time since stream start` : "Captured chat and stream audience"}</p></div>
      <label className="min-w-0 text-sm text-gray-300"><span className="sr-only">Activity metric</span><select value={metric} className="min-h-11 max-w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-white" onChange={event => {
        const next = new URLSearchParams(window.location.search); if (event.target.value === "messages") next.delete("metric"); else next.set("metric", event.target.value);
        window.history.pushState(null, "", `/vods/${vod.id}${next.size ? `?${next}` : ""}`);
      }}>{Object.entries(metrics).map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}</select></label>
    </div>
    {response?.error && <div role="alert" className="mt-4 rounded border border-amber-700 bg-amber-950/30 p-3 text-sm text-amber-200"><p>{activity ? "Could not refresh. Showing the last loaded snapshot." : "Activity could not be loaded."}</p><button type="button" className={`${button} mt-2`} onClick={retry}>Retry activity</button></div>}
    {loading && <p role="status" className="mt-4 text-sm text-gray-300">{activity ? "Refreshing activity…" : "Loading activity…"}</p>}
    {activity && (points.length === 0 ? <div className="py-8 text-gray-300"><p>No timeline is available for this stream yet.</p><button type="button" onClick={retry} disabled={loading} className={`${button} mt-3`}>Refresh activity</button></div> : <figure className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-gray-300">Peak <strong className="tabular-nums text-white">{number(peak)}</strong>{peak !== null && <> {chosen.unit} at {formatStreamTime(elapsed(points[peakIndex].time))}</>}</p>
        <button type="button" className={button} disabled={peak === null} onClick={() => selectInterval(peakIndex)}>Go to peak</button>
      </div>
      <div ref={container} className="mt-2 w-full">
        <svg viewBox={`0 0 ${width} ${plot.height}`} className="block h-56 w-full" role="img" aria-label={`${chosen.label} over time. ${peak === null ? "No samples recorded." : `Peak ${number(peak)} ${chosen.unit}.`} Exact values are available in the interval controls and data table.`} onPointerUp={event => {
          const rect = event.currentTarget.getBoundingClientRect();
          const target = (event.clientX - rect.left) / rect.width * width;
          selectInterval(Math.max(0, points.findLastIndex(point => x(point.time) <= target)));
        }}>
          {[0, 0.5, 1].map(ratio => <g key={ratio} aria-hidden="true"><line x1={plot.left} x2={width - plot.right} y1={y(ratio * maximum)} y2={y(ratio * maximum)} stroke="#374151" /><text x={plot.left - 8} y={y(ratio * maximum) + 4} textAnchor="end" fill="#d1d5db" fontSize="12">{number(ratio * maximum)}</text></g>)}
          <path d={line} fill="none" stroke="#c084fc" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {selected && <line x1={x(selected.time)} x2={x(selected.time)} y1={plot.top} y2={plot.height - plot.bottom} stroke="#f3f4f6" strokeDasharray="4 4" />}
          {ticks.map(ratio => { const time = new Date(start + (end - start) * ratio).toISOString(); return <text key={ratio} x={x(time)} y={plot.height - 8} textAnchor={ratio === 0 ? "start" : ratio === 1 ? "end" : "middle"} fill="#d1d5db" fontSize="12">{formatStreamTime(elapsed(time))}</text>; })}
        </svg>
      </div>
      <div className="mt-2 border-t border-gray-700 pt-4">
        <label htmlFor={`${id}-slider`} className="text-sm text-gray-300">Activity interval</label>
        <input id={`${id}-slider`} type="range" min={0} max={points.length - 1} value={selectedIndex} aria-valuetext={selected ? `${formatStreamTime(selectedTime)} to ${formatStreamTime(elapsed(selected.endTime))}, ${number(selected[chosen.field])} ${chosen.unit}` : undefined} onChange={event => selectInterval(Number(event.target.value))} className="block h-11 w-full accent-purple-400" />
        {selected && <div className="flex flex-wrap items-center justify-between gap-3">
          <output aria-label="Selected activity interval" className="text-sm text-gray-300"><span className="block tabular-nums">{formatStreamTime(selectedTime)}–{formatStreamTime(elapsed(selected.endTime))}</span><strong className="mt-1 block text-lg tabular-nums text-white">{number(selected[chosen.field])}{selected[chosen.field] !== null ? ` ${chosen.unit}` : ""}</strong></output>
          <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={selectedIndex === 0} onClick={() => selectInterval(selectedIndex - 1)}>Previous interval</button><button type="button" className={button} disabled={selectedIndex === points.length - 1} onClick={() => selectInterval(selectedIndex + 1)}>Next interval</button></div>
        </div>}
        <div className="mt-4 flex flex-wrap items-start gap-3">
          {recordingAt(vod, selectedTime) ? <Link href={watchHref(vod.id, selectedTime, returnTo)} className="inline-flex min-h-11 items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700">Watch from {formatStreamTime(selectedTime)}</Link> : <p className="py-2 text-sm text-gray-400">No recording at this point</p>}
          <CopyMomentLink href={`/vods/${vod.id}?${share}`} seconds={selectedTime} />
        </div>
      </div>
      <figcaption className="mt-4 space-y-2 text-xs leading-relaxed text-gray-300"><p>{chosen.description} Chat counts include captured messages only; interruptions in collection may appear as inactivity.</p><p>{vod.endTime ? "Recorded stream" : `Snapshot through ${formatStreamDate(points.at(-1)!.endTime)} Helsinki`}{activity.viewerSource === "chatPresence" && metric !== "viewers" ? " · Audience data uses tracked chat presence." : ""}</p></figcaption>
      <button type="button" className="mt-2 min-h-11 text-sm text-purple-300 hover:text-purple-200 disabled:opacity-40" onClick={retry} disabled={loading}>Refresh activity</button>
      <details className="mt-2 border-t border-gray-700 pt-2" onToggle={event => setShowTable(event.currentTarget.open)}>
        <summary className="min-h-11 cursor-pointer py-3 text-sm text-gray-300">Show interval data</summary>
        {showTable && <table className="w-full table-fixed text-left text-sm tabular-nums"><caption className="sr-only">Activity intervals — {chosen.label}</caption><thead><tr className="border-b border-gray-700 text-gray-300"><th scope="col" className="w-1/2 py-3 font-medium">Time since start</th><th scope="col" className="py-3 font-medium">{chosen.label}</th></tr></thead><tbody>{points.map(point => <tr key={point.time} className="border-b border-gray-800 text-gray-200"><th scope="row" className="py-2 font-normal">{formatStreamTime(elapsed(point.time))}–{formatStreamTime(elapsed(point.endTime))}</th><td className="py-2">{number(point[chosen.field])}</td></tr>)}</tbody></table>}
      </details>
    </figure>)}
  </section>;
}
