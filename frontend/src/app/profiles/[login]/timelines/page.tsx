"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/utils";
import { UserProfile, UserViewSession } from "@/types/api";

interface TimelinesPageProps {
  params: Promise<{ login: string }>;
}

interface StreamGroup {
  streamId: number;
  streamTitle: string;
  gameName: string;
  streamStartTime: string;
  streamEndTime: string | null;
  sessions: UserViewSession[];
  totalDuration: number;
}

export default function UserTimelinesPage({ params }: TimelinesPageProps) {
  const { login } = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<UserViewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const profileRes = await apiClient.getUserProfileByLogin(login);
      if (!profileRes.success || !profileRes.data) {
        setError(profileRes.error || "User not found");
        setLoading(false);
        return;
      }

      setProfile(profileRes.data);

      const sessionsRes = await apiClient.getUserViewSessions(profileRes.data.id);
      if (sessionsRes.success && sessionsRes.data) {
        setSessions(sessionsRes.data);
      }

      setLoading(false);
    };

    fetchData();
  }, [login]);

  // Group sessions by stream, sorted newest first
  const streamGroups = useMemo<StreamGroup[]>(() => {
    const grouped = sessions.reduce<Record<number, StreamGroup>>((acc, s) => {
      if (!acc[s.streamId]) {
        acc[s.streamId] = {
          streamId: s.streamId,
          streamTitle: s.streamTitle,
          gameName: s.gameName,
          streamStartTime: s.streamStartTime,
          streamEndTime: s.streamEndTime,
          sessions: [],
          totalDuration: 0,
        };
      }
      acc[s.streamId].sessions.push(s);
      acc[s.streamId].totalDuration += s.duration || 0;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => new Date(b.streamStartTime).getTime() - new Date(a.streamStartTime).getTime());
  }, [sessions]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading timelines...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href={`/profiles/${login}`} className="text-purple-400 hover:text-purple-300 transition-colors text-sm mb-4 inline-block">
          ← Back to Profile
        </Link>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-2">Failed to load timelines</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/profiles/${login}`} className="text-purple-400 hover:text-purple-300 transition-colors text-sm mb-4 inline-block">
          ← Back to {profile.displayName}
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{profile.displayName}&apos;s Timelines</h1>
        <p className="text-gray-400 text-sm">
          Present in {streamGroups.length} stream{streamGroups.length !== 1 ? "s" : ""} — {formatDuration(profile.totalWatchTime)} total watch time
        </p>
      </div>

      {/* Stream list */}
      {streamGroups.length === 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
          <p className="text-gray-400">No session data available yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {streamGroups.map((group) => (
          <StreamTimelineCard key={group.streamId} group={group} />
        ))}
      </div>
    </div>
  );
}

/** A single stream card with the user's sessions visualized as timeline bars */
function StreamTimelineCard({ group }: { group: StreamGroup }) {
  const streamStart = new Date(group.streamStartTime);
  const streamEnd = group.streamEndTime ? new Date(group.streamEndTime) : new Date();
  const streamDurationMs = streamEnd.getTime() - streamStart.getTime();

  const getPosition = (time: string): number => {
    if (streamDurationMs <= 0) return 0;
    const relativeMs = new Date(time).getTime() - streamStart.getTime();
    return Math.max(0, Math.min(100, (relativeMs / streamDurationMs) * 100));
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      {/* Stream info header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <div className="min-w-0">
          <Link href={`/vods/${group.streamId}`} className="text-white font-medium hover:text-purple-400 transition-colors truncate block">
            {group.streamTitle}
          </Link>
          <div className="text-sm text-purple-400">{group.gameName}</div>
          <div className="text-xs text-gray-500 mt-0.5">{formatDate(group.streamStartTime)}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-white text-sm font-medium">{formatDuration(group.totalDuration)}</div>
            <div className="text-gray-500 text-xs">
              {group.sessions.length} session{group.sessions.length !== 1 ? "s" : ""}
            </div>
          </div>
          <Link href={`/vods/${group.streamId}/timeline`} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-xs font-medium transition-colors">
            Full Timeline
          </Link>
        </div>
      </div>

      {/* Visual timeline bar */}
      <div className="relative h-8 bg-gray-900 rounded overflow-hidden">
        {group.sessions.map((session, i) => {
          const leftPos = getPosition(session.sessionStart);
          const rightPos = session.sessionEnd ? getPosition(session.sessionEnd) : 100;
          const width = Math.max(0.5, rightPos - leftPos);

          return (
            <div
              key={i}
              className="absolute top-1.5 h-5 bg-green-500 rounded"
              style={{
                left: `${leftPos}%`,
                width: `${width}%`,
                minWidth: "3px",
              }}
              title={`${new Date(session.sessionStart).toLocaleTimeString()} → ${
                session.sessionEnd ? new Date(session.sessionEnd).toLocaleTimeString() : "ongoing"
              } (${formatDuration(session.duration)})`}
            />
          );
        })}

        {/* Time labels */}
        <span className="absolute left-1.5 bottom-0.5 text-[10px] text-gray-600">{streamStart.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
        <span className="absolute right-1.5 bottom-0.5 text-[10px] text-gray-600">{streamEnd.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      {/* Session detail rows */}
      {group.sessions.length > 1 && (
        <div className="mt-2 space-y-1">
          {group.sessions.map((session, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Session {i + 1}: {new Date(session.sessionStart).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                {" → "}
                {session.sessionEnd ? new Date(session.sessionEnd).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "ongoing"}
              </span>
              <span className="text-gray-400">{formatDuration(session.duration)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
