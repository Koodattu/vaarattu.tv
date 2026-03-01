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
  const [usernameFilter, setUsernameFilter] = useState("");

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

  // Group sessions by user
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

  // Filter grouped viewers by search term
  const filteredViewers = useMemo(() => {
    if (!usernameFilter) return groupedViewers;
    const term = usernameFilter.toLowerCase();
    return groupedViewers.filter((v) => v.userDisplayName.toLowerCase().includes(term) || v.userLogin.toLowerCase().includes(term));
  }, [groupedViewers, usernameFilter]);

  // Timeline position helpers
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
      {/* Header */}
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

      {/* Stats */}
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

      {/* Segments visualization */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Segments</h2>

        {/* Segment timeline bar */}
        <div className="relative h-12 bg-gray-900 rounded mb-4 overflow-hidden">
          {timeline.segments.map((segment) => {
            const left = getTimelinePosition(segment.startTime);
            const right = segment.endTime ? getTimelinePosition(segment.endTime) : 100;
            const width = Math.max(1, right - left);

            return (
              <div
                key={segment.id}
                className="absolute top-1 bottom-1 bg-purple-600/90 rounded flex items-center justify-center overflow-hidden"
                style={{ left: `${left}%`, width: `${width}%`, minWidth: "40px" }}
                title={`${segment.gameName} (${formatDuration(segment.duration)})`}
              >
                <span className="text-white text-xs font-medium truncate px-1">{segment.gameName}</span>
              </div>
            );
          })}
        </div>

        {/* Segment detail cards */}
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

      {/* Viewer Sessions with visual timeline bars */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-white">
            Viewer Sessions ({filteredViewers.length}
            {usernameFilter ? ` of ${groupedViewers.length}` : ""})
          </h2>

          {/* Search filter */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search viewers..."
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-600 rounded-md text-sm bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-48"
            />
            {usernameFilter && (
              <button onClick={() => setUsernameFilter("")} className="px-2 py-1.5 text-xs text-gray-400 hover:text-white transition-colors" title="Clear filter">
                ✕
              </button>
            )}
          </div>
        </div>

        {timeline.viewerSessions.length === 0 && <p className="text-gray-400 text-sm">No viewer session data available for this stream.</p>}

        {filteredViewers.length === 0 && timeline.viewerSessions.length > 0 && (
          <div className="text-center py-6 text-gray-500">
            No viewers matching &ldquo;{usernameFilter}&rdquo;.{" "}
            <button onClick={() => setUsernameFilter("")} className="text-purple-400 hover:text-purple-300 underline">
              Clear filter
            </button>
          </div>
        )}

        {filteredViewers.length > 0 && (
          <div className="space-y-1">
            {filteredViewers.map((viewer) => (
              <div key={viewer.userId} className="flex items-center gap-3 py-1.5">
                {/* Username */}
                <Link
                  href={`/profiles/${viewer.userLogin}`}
                  className="w-32 text-sm font-medium text-white truncate hover:text-purple-400 transition-colors flex-shrink-0"
                  title={viewer.userDisplayName}
                >
                  {viewer.userDisplayName}
                </Link>

                {/* Visual timeline bar */}
                <div className="flex-1 relative h-6 bg-gray-900 rounded overflow-hidden">
                  {viewer.sessions.map((session, sessionIndex) => {
                    const leftPos = getTimelinePosition(session.sessionStart);
                    const rightPos = session.sessionEnd ? getTimelinePosition(session.sessionEnd) : 100;
                    const width = Math.max(0.5, rightPos - leftPos);

                    return (
                      <div
                        key={sessionIndex}
                        className="absolute top-1 h-4 bg-green-500 rounded"
                        style={{
                          left: `${leftPos}%`,
                          width: `${width}%`,
                          minWidth: "2px",
                        }}
                        title={`${viewer.userDisplayName}: ${formatDuration(session.duration)} — ${new Date(session.sessionStart).toLocaleTimeString()} to ${
                          session.sessionEnd ? new Date(session.sessionEnd).toLocaleTimeString() : "ongoing"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Duration / session count */}
                <div className="w-20 text-xs text-gray-400 text-right flex-shrink-0">
                  <div>{formatDuration(viewer.totalDuration)}</div>
                  <div className="text-gray-600">
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
