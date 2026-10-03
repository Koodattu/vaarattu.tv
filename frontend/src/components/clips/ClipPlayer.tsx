"use client";

import { useEffect, useRef, useState } from "react";
import { useHostname } from "@/hooks/useHostname";
import { ClipThumbnail } from "./ClipThumbnail";

export function ClipPlayer({ id, title, thumbnailUrl }: { id: string; title: string; thumbnailUrl: string | null }) {
  const hostname = useHostname();
  const container = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWide(entries[0].contentRect.width >= 400));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={container}>
    {wide && hostname && attempt > 0 ? <EmbeddedClip key={attempt} id={id} title={title} hostname={hostname} /> : <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-900">
      <ClipThumbnail src={thumbnailUrl} eager />
      {wide && hostname && <div className="absolute inset-0 flex items-center justify-center bg-black/25"><button type="button" onClick={() => setAttempt(1)} className="min-h-11 rounded-md bg-purple-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-purple-700">Play clip</button></div>}
    </div>}
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <a href={`https://clips.twitch.tv/${encodeURIComponent(id)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-md bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700">Watch on Twitch ↗</a>
      {wide && attempt > 0 && <button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800">Reload player</button>}
      <p className="text-sm text-gray-400">{wide ? "If playback is unavailable here, try Twitch." : "Watch on Twitch for playback on a small screen."}</p>
    </div>
  </div>;
}

function EmbeddedClip({ id, title, hostname }: { id: string; title: string; hostname: string }) {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, [loaded]);
  const query = new URLSearchParams({ clip: id, parent: hostname, autoplay: "true" });
  return <>
    <iframe src={`https://clips.twitch.tv/embed?${query}`} title={`Twitch clip: ${title}`} allow="autoplay; fullscreen" allowFullScreen onLoad={() => setLoaded(true)} className="aspect-video min-h-[300px] w-full rounded-lg border-0 bg-black" />
    {!loaded && <p role="status" className="mt-2 text-sm text-gray-300">{slow ? "The Twitch player is taking longer than expected. Reload it or watch on Twitch." : "Loading Twitch player…"}</p>}
  </>;
}
