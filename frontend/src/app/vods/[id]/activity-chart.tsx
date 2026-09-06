"use client";

import { useEffect, useId, useState } from "react";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { StreamActivity } from "@/types/api";

const series = [
  { key: "viewers", label: "Tracked viewers", color: "#34d399" },
  { key: "messagesPerMinute", label: "Messages / min", color: "#c084fc" },
  { key: "activeChatters", label: "Peak active chatters", color: "#38bdf8" },
] as const;
const width = 900;
const height = 280;
const plot = { left: 64, right: 64, top: 24, bottom: 40 };
const number = (value: number | null) => value === null ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: 1 });

export function StreamActivityChart({ streamId }: { streamId: number }) {
  const [activity, setActivity] = useState<StreamActivity | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visible, setVisible] = useState({ viewers: true, messagesPerMinute: true, activeChatters: true });
  const sliderId = useId();

  useEffect(() => {
    let cancelled = false;
    apiClient.getStreamActivity(streamId).then((response) => {
      if (cancelled) return;
      setActivity(response.success && response.data ? response.data : null);
      setError(!response.success || !response.data);
    });
    return () => { cancelled = true; };
  }, [streamId, attempt]);

  const points = activity?.points ?? [];
  const hasData = points.some((point) => point.viewers !== null || point.messagesPerMinute > 0);
  const viewerMax = Math.max(1, ...points.map((point) => point.viewers ?? 0));
  const chatMax = Math.max(1, ...points.map((point) => Math.max(visible.messagesPerMinute ? point.messagesPerMinute : 0, visible.activeChatters ? point.activeChatters : 0)));
  const firstTime = new Date(points[0]?.time ?? 0).getTime();
  const lastTime = new Date(points.at(-1)?.endTime ?? 0).getTime();
  const x = (time: string) => plot.left + (new Date(time).getTime() - firstTime) / Math.max(1, lastTime - firstTime) * (width - plot.left - plot.right);
  const y = (value: number, max: number) => plot.top + (1 - value / max) * (height - plot.top - plot.bottom);
  const selected = points[Math.min(selectedIndex, points.length - 1)];
  const elapsed = (time: string) => {
    const minutes = Math.floor((new Date(time).getTime() - firstTime) / 60000);
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  };

  return (
    <section className="mb-8 overflow-hidden rounded-lg border border-gray-700 bg-gray-800" aria-labelledby={`${sliderId}-heading`}>
      <div className="border-b border-gray-700 p-5">
        <h2 id={`${sliderId}-heading`} className="text-xl font-semibold text-white">Activity over time</h2>
        <p className="mt-1 text-sm text-gray-400">{activity ? `${activity.intervalMinutes}-minute intervals · Time since stream start` : "Stream audience and chat activity"}</p>
      </div>
      {error ? (
        <div className="p-8 text-center text-gray-400" role="status">
          <p>Activity could not be loaded.</p>
          <button type="button" className="mt-3 text-purple-400 hover:text-purple-300" onClick={() => { setError(false); setAttempt(attempt + 1); }}>Try again</button>
        </div>
      ) : !activity ? <p className="p-8 text-center text-gray-400" role="status">Loading activity...</p>
        : !hasData ? <p className="p-8 text-center text-gray-400">No activity has been recorded for this stream.</p>
          : (
            <figure>
              <div className="grid grid-cols-1 gap-4 border-b border-gray-700 p-5 sm:grid-cols-3">
                {series.map((item) => {
                  const values = points.map((point) => point[item.key]).filter((value) => value !== null);
                  return <div key={item.key}>
                    <p className="text-sm text-gray-400">{item.key === "viewers" ? "Peak tracked viewers" : item.key === "messagesPerMinute" ? "Peak messages / min" : item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-white">{number(values.length ? Math.max(...values) : null)}</p>
                  </div>;
                })}
              </div>
              <div className="flex flex-wrap gap-2 px-5 pt-5" aria-label="Chart series">
                {series.map((item) => <button key={item.key} type="button" aria-pressed={visible[item.key]}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-purple-400 ${visible[item.key] ? "border-gray-500 bg-gray-900 text-white" : "border-gray-700 text-gray-500"}`}
                  onClick={() => setVisible({ ...visible, [item.key]: !visible[item.key] })}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}
                </button>)}
              </div>
              <div className="flex justify-between px-5 pt-5 text-xs text-gray-400"><span>Tracked viewers</span><span>Messages / min · Chatters</span></div>
              <div className="overflow-x-auto px-2">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[600px]" role="img" aria-label="Stream activity over time. Use the interval slider below to inspect values."
                  onPointerMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const target = (event.clientX - rect.left) / rect.width * width;
                    let index = 0;
                    points.forEach((point, candidate) => { if (x(point.time) <= target) index = candidate; });
                    setSelectedIndex(index);
                  }}>
                  {[0, 0.5, 1].map((ratio) => <g key={ratio} aria-hidden="true">
                    <line x1={plot.left} x2={width - plot.right} y1={y(ratio, 1)} y2={y(ratio, 1)} stroke="#374151" />
                    <text x={plot.left - 10} y={y(ratio, 1) + 4} textAnchor="end" fill="#9ca3af" fontSize="12">{visible.viewers ? number(ratio * viewerMax) : "—"}</text>
                    <text x={width - plot.right + 10} y={y(ratio, 1) + 4} fill="#9ca3af" fontSize="12">{visible.messagesPerMinute || visible.activeChatters ? number(ratio * chatMax) : "—"}</text>
                  </g>)}
                  {series.filter((item) => visible[item.key]).map((item) => {
                    let drawing = false;
                    const path = points.map((point) => {
                      const value = point[item.key];
                      if (value === null) { drawing = false; return ""; }
                      const position = y(value, item.key === "viewers" ? viewerMax : chatMax);
                      const segment = `${drawing ? "L" : "M"} ${x(point.time)} ${position} L ${x(point.endTime)} ${position}`;
                      drawing = true;
                      return segment;
                    }).join(" ");
                    return <path key={item.key} d={path} fill="none" stroke={item.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />;
                  })}
                  {selected && <line x1={x(selected.time)} x2={x(selected.time)} y1={plot.top} y2={height - plot.bottom} stroke="#d1d5db" strokeDasharray="4 4" />}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const time = new Date(firstTime + (lastTime - firstTime) * ratio).toISOString();
                    return <text key={ratio} x={x(time)} y={height - 12} textAnchor={ratio === 0 ? "start" : ratio === 1 ? "end" : "middle"} fill="#9ca3af" fontSize="12">{elapsed(time)}</text>;
                  })}
                </svg>
              </div>
              <div className="mx-5 mb-4 rounded-md bg-gray-900 p-4">
                <label htmlFor={sliderId} className="text-sm text-gray-400">Inspect an interval</label>
                <input id={sliderId} type="range" min={0} max={points.length - 1} value={Math.min(selectedIndex, points.length - 1)}
                  onChange={(event) => setSelectedIndex(Number(event.target.value))} aria-valuetext={selected ? formatDate(selected.time) : undefined}
                  className="my-3 block w-full accent-purple-500" />
                {selected && <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-live="polite">
                  <strong className="text-white">{elapsed(selected.time)}–{elapsed(selected.endTime)}</strong>
                  {series.map((item) => <span key={item.key} style={{ color: item.color }}>{item.label}: {number(selected[item.key])}</span>)}
                </div>}
              </div>
              <figcaption className="px-5 pb-5 text-xs leading-relaxed text-gray-400">
                Tracked viewers use the left scale and show peak chat presence per interval, not Twitch’s total audience.
                Chat activity uses the right scale. Peak active chatters counts the most distinct people who sent a message in one minute within each interval.
                Messages reflect captured chat only; gaps in tracking may appear as inactivity.
              </figcaption>
            </figure>
          )}
    </section>
  );
}
