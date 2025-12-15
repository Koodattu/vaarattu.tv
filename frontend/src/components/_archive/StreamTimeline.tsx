"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { StreamTimeline as StreamTimelineType } from "@/types/api";
import { apiClient } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/utils";

interface StreamTimelineProps {
  streamId: number;
  onBack: () => void;
}

export function StreamTimeline({ streamId, onBack }: StreamTimelineProps) {
  const [timeline, setTimeline] = useState<StreamTimelineType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usernameFilter, setUsernameFilter] = useState<string>("");

  useEffect(() => {
    const fetchTimeline = async () => {
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
  }, [streamId]);

  // Group viewer sessions by user and filter based on username
  const groupedAndFilteredViewers = (() => {
    if (!timeline) return [];

    // Group sessions by userId
    const groupedSessions = timeline.viewerSessions.reduce(
      (acc, session) => {
        const userId = session.userId;
        if (!acc[userId]) {
          acc[userId] = {
            userId: session.userId,
            userLogin: session.userLogin,
            userDisplayName: session.userDisplayName,
            sessions: [],
            totalDuration: 0,
          };
        }
        acc[userId].sessions.push(session);
        acc[userId].totalDuration += session.duration || 0;
        return acc;
      },
      {} as Record<
        number,
        {
          userId: number;
          userLogin: string;
          userDisplayName: string;
          sessions: typeof timeline.viewerSessions;
          totalDuration: number;
        }
      >
    );

    // Convert to array and filter by username
    const groupedArray = Object.values(groupedSessions);

    return groupedArray
      .filter((user) => user.userDisplayName.toLowerCase().includes(usernameFilter.toLowerCase()) || user.userLogin.toLowerCase().includes(usernameFilter.toLowerCase()))
      .sort((a, b) => b.totalDuration - a.totalDuration); // Sort by total duration (longest first)
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Loading timeline...</span>
      </div>
    );
  }

  if (error || !timeline) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-2">❌ Error loading timeline</div>
        <div className="text-gray-600 text-sm mb-4">{error}</div>
        <button onClick={onBack} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md">
          ← Back to Streams
        </button>
      </div>
    );
  }

  // Calculate timeline scale based on stream duration
  const streamStart = new Date(timeline.startTime);
  const streamEnd = timeline.endTime ? new Date(timeline.endTime) : new Date();
  const totalDuration = streamEnd.getTime() - streamStart.getTime();

  const getTimelinePosition = (time: string): number => {
    const timeMs = new Date(time).getTime();
    const relativeTime = timeMs - streamStart.getTime();
    return Math.max(0, Math.min(100, (relativeTime / totalDuration) * 100));
  };

  const getSegmentWidth = (segment: StreamTimelineType["segments"][0]): number => {
    if (!segment.endTime) return 100 - getTimelinePosition(segment.startTime);

    const startPos = getTimelinePosition(segment.startTime);
    const endPos = getTimelinePosition(segment.endTime);
    return endPos - startPos;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm">
          ← Back to Streams
        </button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Stream Timeline</h1>
        <div className="text-gray-600 dark:text-gray-300">
          {formatDate(timeline.startTime)} • {formatDuration(timeline.duration)}
        </div>

        {/* Stream stats */}
        <div className="flex gap-6 mt-4 text-sm">
          <div className="flex items-center gap-1">
            <span>💬</span>
            <span>{timeline.stats.totalMessages.toLocaleString()} messages</span>
          </div>
          <div className="flex items-center gap-1">
            <span>👥</span>
            <span>{timeline.stats.uniqueViewers} unique viewers</span>
          </div>
          <div className="flex items-center gap-1">
            <span>📈</span>
            <span>{timeline.stats.peakViewers} peak viewers</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🎁</span>
            <span>{timeline.stats.totalRedemptions} redemptions</span>
          </div>
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Stream Segments</h2>

        {/* Time ruler */}
        <div className="relative h-16 mb-4 bg-gray-100 dark:bg-gray-700 rounded">
          <div className="absolute top-0 left-0 w-full h-full">
            {/* Stream segments */}
            {timeline.segments.map((segment) => {
              const leftPos = getTimelinePosition(segment.startTime);
              const width = getSegmentWidth(segment);

              return (
                <div
                  key={segment.id}
                  className="absolute top-2 h-12 bg-purple-500 rounded flex items-center justify-center text-white text-sm font-medium overflow-hidden"
                  style={{
                    left: `${leftPos}%`,
                    width: `${width}%`,
                    minWidth: "60px",
                  }}
                  title={`${segment.gameName} - ${formatDuration(segment.duration)}`}
                >
                  <span className="truncate px-2">{segment.gameName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Segment details */}
        <div className="space-y-2">
          {timeline.segments.map((segment) => (
            <div key={segment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="flex items-center gap-3">
                {segment.gameBoxArtUrl && <Image src={segment.gameBoxArtUrl} alt={segment.gameName} width={48} height={64} className="object-cover rounded" />}
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{segment.gameName}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{segment.title}</div>
                </div>
              </div>
              <div className="text-right text-sm text-gray-600 dark:text-gray-300">
                <div>{formatDuration(segment.duration)}</div>
                <div>{new Date(segment.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Viewer sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Viewer Sessions ({groupedAndFilteredViewers.length} {usernameFilter ? "filtered" : "unique"} viewers)
          </h2>

          {/* Username filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="username-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter:
            </label>
            <input
              id="username-filter"
              type="text"
              placeholder="Username..."
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {usernameFilter && (
              <button
                onClick={() => setUsernameFilter("")}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {groupedAndFilteredViewers.map((user) => {
            // Calculate total duration for this user
            const totalUserDuration = user.totalDuration;

            return (
              <div key={user.userId} className="flex items-center gap-4 py-2">
                <div className="w-32 text-sm font-medium text-gray-900 dark:text-white truncate" title={user.userDisplayName}>
                  {user.userDisplayName}
                </div>
                <div className="flex-1 relative h-6 bg-gray-100 dark:bg-gray-700 rounded">
                  {/* Render each session as a separate segment */}
                  {user.sessions.map((session, sessionIndex) => {
                    const leftPos = getTimelinePosition(session.sessionStart);
                    const width = session.sessionEnd ? getTimelinePosition(session.sessionEnd) - leftPos : 100 - leftPos;

                    return (
                      <div
                        key={sessionIndex}
                        className="absolute top-1 h-4 bg-green-500 rounded"
                        style={{
                          left: `${leftPos}%`,
                          width: `${width}%`,
                          minWidth: "2px",
                        }}
                        title={`${user.userDisplayName}: ${formatDuration(session.duration)} - ${new Date(session.sessionStart).toLocaleTimeString()} to ${
                          session.sessionEnd ? new Date(session.sessionEnd).toLocaleTimeString() : "ongoing"
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="w-20 text-xs text-gray-600 dark:text-gray-300 text-right">
                  <div>{formatDuration(totalUserDuration)}</div>
                  <div className="text-gray-500">
                    {user.sessions.length} session{user.sessions.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {groupedAndFilteredViewers.length === 0 && timeline && timeline.viewerSessions.length > 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No viewers found matching &ldquo;{usernameFilter}&rdquo;.{" "}
            <button onClick={() => setUsernameFilter("")} className="text-purple-600 hover:text-purple-800 underline">
              Clear filter
            </button>
          </div>
        )}

        {timeline && timeline.viewerSessions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No viewer session data available for this stream.</div>
        )}
      </div>
    </div>
  );
}
