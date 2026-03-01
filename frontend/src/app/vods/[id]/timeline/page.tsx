"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiClient } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/utils";
import { StreamTimeline } from "@/types/api";

interface VodTimelinePageProps {
  params: Promise<{ id: string }>;
}

interface GroupedViewerSessions {
  userId: number;
  userLogin: string;
  userDisplayName: string;
  sessions: StreamTimeline["viewerSessions"];
  totalDuration: number;
}

export default function VodTimelinePage({ params }: VodTimelinePageProps) {
  const { id } = use(params);
  const [timeline, setTimeline] = useState<StreamTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      const streamId = parseInt(id, 10);
      if (Number.isNaN(streamId)) {
        setError("Invalid VOD ID");
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await apiClient.getStreamTimeline(streamId);

      if (response.success && response.data) {
        setTimeline(response.data);
        setError(null);
      } else {
        setError(response.error || "Failed to load stream timeline");
      }
      setLoading(false);
    };

    fetchTimeline();
  }, [id]);

  const groupedViewers = useMemo<GroupedViewerSessions[]>(() => {
    if (!timeline) return [];

    const grouped = timeline.viewerSessions.reduce<Record<number, GroupedViewerSessions>>((acc, session) => {
      if (!acc[session.userId]) {
        acc[session.userId] = {
          userId: session.userId,
          userLogin: session.userLogin,
          userDisplayName: session.userDisplayName,
          sessions: [],
          totalDuration: 0,
        };
      }

      acc[session.userId].sessions.push(session);
      acc[session.userId].totalDuration += session.duration || 0;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.totalDuration - a.totalDuration);
  }, [timeline]);

  const streamStart = timeline ? new Date(timeline.startTime) : null;
  const streamEnd = timeline ? (timeline.endTime ? new Date(timeline.endTime) : new Date()) : null;
  const streamDurationMs = streamStart && streamEnd ? streamEnd.getTime() - streamStart.getTime() : 0;

  const getTimelinePosition = (time: string): number => {
    if (!streamStart || streamDurationMs <= 0) return 0;
    const relativeMs = new Date(time).getTime() - streamStart.getTime();
    return Math.max(0, Math.min(100, (relativeMs / streamDurationMs) * 100));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading timeline...</span>
        </div>
      </div>
    );
  }

  if (error || !timeline) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href={`/vods/${id}`} className="text-purple-400 hover:text-purple-300 transition-colors text-sm mb-4 inline-block">
          ← Back to VOD
        </Link>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-2">Failed to load timeline</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/vods/${id}`} className="text-purple-400 hover:text-purple-300 transition-colors text-sm mb-4 inline-block">
          ← Back to VOD
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Stream Timeline</h1>
        <div className="flex flex-wrap items-center gap-4 text-gray-400">
          <span>{formatDate(timeline.startTime)}</span>
          {timeline.duration && <span className="text-purple-400">{formatDuration(timeline.duration)}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xl font-bold text-white">{timeline.stats.totalMessages.toLocaleString()}</div>
          <div className="text-xs text-gray-400">Messages</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xl font-bold text-white">{timeline.stats.uniqueViewers}</div>
          <div className="text-xs text-gray-400">Unique viewers</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xl font-bold text-white">{timeline.stats.peakViewers}</div>
          <div className="text-xs text-gray-400">Peak viewers</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xl font-bold text-white">{timeline.stats.totalRedemptions}</div>
          <div className="text-xs text-gray-400">Redemptions</div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Segments</h2>

        <div className="relative h-12 bg-gray-900 rounded mb-4 overflow-hidden">
          {timeline.segments.map((segment) => {
            const left = getTimelinePosition(segment.startTime);
            const right = segment.endTime ? getTimelinePosition(segment.endTime) : 100;
            const width = Math.max(1, right - left);

            return (
              <div
                key={segment.id}
                className="absolute top-1 bottom-1 bg-purple-600/90 rounded"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                title={`${segment.gameName} (${formatDuration(segment.duration)})`}
              />
            );
          })}
        </div>

        <div className="space-y-3">
          {timeline.segments.map((segment, index) => (
            <div key={segment.id} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">{index + 1}</div>
                {segment.gameBoxArtUrl && (
                  <Image src={segment.gameBoxArtUrl.replace("{width}", "52").replace("{height}", "72")} alt={segment.gameName} width={52} height={72} className="rounded" />
                )}
                <div className="min-w-0">
                  <div className="text-white font-medium truncate">{segment.title}</div>
                  <div className="text-sm text-purple-400">{segment.gameName}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(segment.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    {segment.endTime && (
                      <>
                        {" → "}
                        {new Date(segment.endTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </>
                    )}
                    {segment.duration && <span className="ml-2 text-gray-400">({formatDuration(segment.duration)})</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h2 className="text-xl font-semibold text-white mb-4">Viewer Sessions ({groupedViewers.length})</h2>

        {groupedViewers.length === 0 && <p className="text-gray-400 text-sm">No viewer session data available for this stream.</p>}

        {groupedViewers.length > 0 && (
          <div className="space-y-2">
            {groupedViewers.map((viewer) => (
              <div key={viewer.userId} className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium truncate">{viewer.userDisplayName}</div>
                  <div className="text-xs text-gray-500">@{viewer.userLogin}</div>
                </div>
                <div className="text-sm text-gray-300 text-right">
                  <div>{formatDuration(viewer.totalDuration)}</div>
                  <div className="text-xs text-gray-500">
                    {viewer.sessions.length} session{viewer.sessions.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
