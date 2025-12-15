"use client";

import { useEffect, useRef, useState } from "react";

interface TwitchStreamEmbedProps {
  channel: string;
  width?: string | number;
  height?: string | number;
  muted?: boolean;
  autoplay?: boolean;
}

export function TwitchStreamEmbed({ channel, width = "100%", height = "100%", muted = true, autoplay = true }: TwitchStreamEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [parentDomain, setParentDomain] = useState<string>("");

  useEffect(() => {
    // Get the parent domain for Twitch embed
    setParentDomain(window.location.hostname);
  }, []);

  if (!parentDomain) {
    return (
      <div className="flex items-center justify-center bg-gray-800 rounded-lg" style={{ width, height, minHeight: 300 }}>
        <div className="animate-pulse text-gray-400">Loading stream...</div>
      </div>
    );
  }

  const embedUrl = `https://player.twitch.tv/?channel=${channel}&parent=${parentDomain}&muted=${muted}&autoplay=${autoplay}`;

  return (
    <div ref={containerRef} className="relative" style={{ width, height }}>
      <iframe src={embedUrl} width="100%" height="100%" allowFullScreen className="rounded-lg" title={`${channel}'s Twitch Stream`} />
    </div>
  );
}
