"use client";

import { useEffect, useRef, useState } from "react";

interface PlayerClock { getCurrentTime(): number }
interface YoutubePlayer extends PlayerClock { destroy(): void }
interface TwitchPlayer extends PlayerClock { pause(): void; addEventListener(event: string, callback: () => void): void }
interface PlayerWindow extends Window {
  YT?: { Player: new (element: HTMLElement, options: Record<string, unknown>) => YoutubePlayer };
  Twitch?: { Player: { new (id: string, options: Record<string, unknown>): TwitchPlayer; READY: string; ENDED: string } };
  onYouTubeIframeAPIReady?: () => void;
}

const scripts: Partial<Record<"youtube" | "twitch", Promise<void>>> = {};
function loadPlayerScript(provider: "youtube" | "twitch") {
  const target = window as PlayerWindow;
  if (provider === "youtube" ? target.YT?.Player : target.Twitch?.Player) return Promise.resolve();
  if (scripts[provider]) return scripts[provider]!;
  scripts[provider] = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) { script.remove(); reject(error); } else resolve();
    };
    const timeout = setTimeout(() => finish(new Error("The video player took too long to load.")), 20000);
    script.src = provider === "youtube" ? "https://www.youtube.com/iframe_api" : "https://player.twitch.tv/js/embed/v1.js";
    script.async = true;
    script.onerror = () => finish(new Error("The video player could not be loaded."));
    if (provider === "youtube") {
      const previous = target.onYouTubeIframeAPIReady;
      target.onYouTubeIframeAPIReady = () => { previous?.(); finish(); };
    } else script.onload = () => finish();
    document.head.appendChild(script);
  }).catch((error) => { delete scripts[provider]; throw error; });
  return scripts[provider]!;
}

export function RecordingPlayer({ provider, videoId, startSeconds, streamOffsetSeconds, autoplay, onTime, onEnded }: {
  provider: "youtube" | "twitch";
  videoId: string;
  startSeconds: number;
  streamOffsetSeconds: number;
  autoplay: boolean;
  onTime: (seconds: number) => void;
  onEnded: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const root = container.current!;
    let cancelled = false;
    let player: PlayerClock | null = null;
    let destroy: (() => void) | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const clockReady = () => {
      if (cancelled) return;
      setReady(true);
      clearInterval(timer);
      timer = setInterval(() => {
        if (cancelled || !player) return;
        const time = player.getCurrentTime();
        if (Number.isFinite(time)) onTime(streamOffsetSeconds + time);
      }, 250);
    };
    void loadPlayerScript(provider).then(() => {
      if (cancelled) return;
      const mount = document.createElement("div");
      mount.id = `vod-player-${crypto.randomUUID()}`;
      root.appendChild(mount);
      const target = window as PlayerWindow;
      if (provider === "youtube") {
        const youtube = new target.YT!.Player(mount, {
          videoId, width: "100%", height: "100%",
          playerVars: { autoplay: autoplay ? 1 : 0, start: Math.floor(startSeconds), origin: window.location.origin, playsinline: 1 },
          events: {
            onReady: clockReady,
            onStateChange: (event: { data: number }) => { if (!cancelled && event.data === 0) onEnded(); },
            onError: () => { if (!cancelled) setError("This recording cannot be played here. Try opening it on YouTube or choosing another recording."); },
          },
        });
        player = youtube;
        destroy = () => youtube.destroy();
      } else {
        const twitch = new target.Twitch!.Player(mount.id, {
          video: `v${videoId.replace(/^v/, "")}`, width: "100%", height: "100%", parent: [window.location.hostname],
          autoplay, time: `${Math.floor(startSeconds)}s`,
        });
        player = twitch;
        twitch.addEventListener(target.Twitch!.Player.READY, clockReady);
        twitch.addEventListener(target.Twitch!.Player.ENDED, () => { if (!cancelled) onEnded(); });
        destroy = () => { if (root.querySelector("iframe")) twitch.pause(); };
      }
    }).catch(() => { if (!cancelled) setError("The video player could not be loaded. Try opening the recording using the link below."); });
    return () => {
      cancelled = true;
      clearInterval(timer);
      destroy?.();
      root.replaceChildren();
    };
  }, [provider, videoId, startSeconds, streamOffsetSeconds, autoplay, onTime, onEnded]);

  const url = provider === "youtube" ? `https://www.youtube.com/watch?v=${videoId}` : `https://www.twitch.tv/videos/${videoId}`;
  return <div>
    <div ref={container} className="aspect-video min-h-[300px] overflow-hidden rounded-lg bg-gray-950" />
    {error ? <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p>
      : !ready && <p role="status" className="mt-3 text-sm text-gray-400">Loading player...</p>}
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-purple-400 hover:text-purple-300">Open on {provider === "youtube" ? "YouTube" : "Twitch"} ↗</a>
  </div>;
}
