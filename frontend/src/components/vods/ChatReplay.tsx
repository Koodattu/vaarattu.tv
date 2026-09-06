"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import type { ChatReplayMessage } from "@/types/api";

export function ChatReplay({ streamId, seconds, totalMessages }: { streamId: number; seconds: number | null; totalMessages: number }) {
  const [loaded, setLoaded] = useState<{ bucket: number; messages: ChatReplayMessage[] } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [follow, setFollow] = useState(true);
  const [adjustment, setAdjustment] = useState(0);
  const cache = useRef(new Map<number, ChatReplayMessage[]>());
  const list = useRef<HTMLDivElement>(null);
  const replaySeconds = seconds === null ? null : Math.max(0, seconds + adjustment);
  const bucket = replaySeconds === null ? -1 : Math.floor(replaySeconds / 30) * 30;

  useEffect(() => {
    if (bucket < 0 || totalMessages === 0) return;
    let cancelled = false;
    async function load() {
      const messages: ChatReplayMessage[] = [];
      for (const start of [bucket - 30, bucket]) {
        if (start < 0) continue;
        let windowMessages = cache.current.get(start);
        if (!windowMessages) {
          windowMessages = [];
          let after: string | undefined;
          do {
            const response = await apiClient.getChatReplay(streamId, start, after);
            if (cancelled) return;
            if (!response.success || !response.data) { setError(true); return; }
            windowMessages.push(...response.data.messages);
            after = response.data.nextCursor ?? undefined;
          } while (after);
          cache.current.set(start, windowMessages);
        }
        messages.push(...windowMessages);
      }
      if (cancelled) return;
      for (const key of cache.current.keys()) if (key < bucket - 30 || key > bucket + 30) cache.current.delete(key);
      setError(false);
      setLoaded({ bucket, messages });
    }
    void load();
    return () => { cancelled = true; };
  }, [streamId, bucket, totalMessages, retry]);

  const visible = loaded?.bucket === bucket && replaySeconds !== null ? loaded.messages.filter((message) => message.offsetSeconds <= replaySeconds).slice(-200) : [];
  const lastId = visible[visible.length - 1]?.id;
  useEffect(() => {
    if (follow && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [lastId, follow, bucket]);

  return <aside className="flex h-[540px] min-h-[300px] flex-col rounded-lg border border-gray-700 bg-gray-900 lg:h-full lg:max-h-[720px]">
    <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
      <h2 className="font-semibold text-white">Chat replay</h2>
      <label className="flex items-center gap-2 text-xs text-gray-400"><input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} />Follow chat</label>
    </div>
    <div ref={list} role="log" aria-label="Recorded chat messages" aria-live="off" className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 text-sm">
      {totalMessages === 0 ? <p className="text-gray-400">No chat was recorded for this stream.</p>
        : seconds === null ? <p className="text-gray-400">Play the recording to replay chat.</p>
          : error ? <div className="text-gray-400"><p>Chat could not be loaded.</p><button onClick={() => setRetry((value) => value + 1)} className="mt-2 text-purple-400">Try again</button></div>
            : loaded?.bucket !== bucket ? <p role="status" className="text-gray-400">Loading chat...</p>
              : visible.length === 0 ? <p className="text-gray-400">No recorded messages at this point.</p>
                : visible.map((message) => <p key={message.id} className="break-words">
                  <span className="mr-2 text-xs tabular-nums text-gray-500">{Math.floor(message.offsetSeconds / 3600)}:{String(Math.floor(message.offsetSeconds / 60) % 60).padStart(2, "0")}:{String(Math.floor(message.offsetSeconds) % 60).padStart(2, "0")}</span>
                  <span className="font-semibold text-purple-300">{message.user.displayName || message.user.login}</span>{" "}
                  <span className="whitespace-pre-wrap text-gray-200">{message.content}</span>
                </p>)}
    </div>
    <label className="flex items-center justify-between gap-2 border-t border-gray-700 px-4 py-3 text-xs text-gray-400">
      Chat timing (seconds)
      <input aria-label="Chat timing adjustment in seconds" type="number" min={-300} max={300} step={1} value={adjustment}
        onChange={(event) => setAdjustment(Math.max(-300, Math.min(300, Number(event.target.value) || 0)))} className="w-20 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-white" />
    </label>
  </aside>;
}
