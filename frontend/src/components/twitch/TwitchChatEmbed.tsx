"use client";

import { useEffect, useState } from "react";

interface TwitchChatEmbedProps {
  channel: string;
  width?: string | number;
  height?: string | number;
  darkMode?: boolean;
}

export function TwitchChatEmbed({ channel, width = "100%", height = "100%", darkMode = true }: TwitchChatEmbedProps) {
  const [parentDomain, setParentDomain] = useState<string>("");

  useEffect(() => {
    // Get the parent domain for Twitch embed
    setParentDomain(window.location.hostname);
  }, []);

  if (!parentDomain) {
    return (
      <div className="flex items-center justify-center bg-gray-800 rounded-lg" style={{ width, height, minHeight: 300 }}>
        <div className="animate-pulse text-gray-400">Loading chat...</div>
      </div>
    );
  }

  const embedUrl = `https://www.twitch.tv/embed/${channel}/chat?parent=${parentDomain}${darkMode ? "&darkpopout" : ""}`;

  return (
    <div className="relative" style={{ width, height }}>
      <iframe src={embedUrl} width="100%" height="100%" className="rounded-lg" title={`${channel}'s Twitch Chat`} />
    </div>
  );
}
