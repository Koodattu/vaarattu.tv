"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { StreamDetail } from "@/types/api";
import { apiClient } from "@/lib/api";
import { formatDate, formatDuration, formatRelativeTime } from "@/lib/utils";

interface VodDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function VodDetailPage({ params }: VodDetailPageProps) {
  const { id } = use(params);
  const [vod, setVod] = useState<StreamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentDomain, setParentDomain] = useState<string>("");

  useEffect(() => {
    setParentDomain(window.location.hostname);
  }, []);

  useEffect(() => {
    const fetchVod = async () => {
      const streamId = parseInt(id);
      if (isNaN(streamId)) {
        setError("Invalid VOD ID");
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await apiClient.getStream(streamId);

      if (response.success && response.data) {
        setVod(response.data);
        setError(null);
      } else {
        setError(response.error || "Failed to load VOD");
      }
      setLoading(false);
    };

    fetchVod();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading VOD...</span>
        </div>
      </div>
    );
  }

  if (error || !vod) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/vods" className="text-purple-400 hover:text-purple-300 transition-colors text-sm mb-4 inline-block">
          ← Back to VODs
        </Link>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-2">Failed to load VOD</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const firstSegment = vod.segments[0];
  const uniqueGames = [...new Set(vod.segments.map((s) => s.gameName))];

  // Twitch VOD embed URL
  const vodEmbedUrl = parentDomain ? `https://player.twitch.tv/?video=${vod.twitchId}&parent=${parentDomain}&autoplay=false` : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/vods" className="text-purple-400 hover:text-purple-300 transition-colors text-sm mb-4 inline-block">
          ← Back to VODs
        </Link>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{firstSegment?.title || "Stream"}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-400">
              <span>{formatDate(vod.startTime)}</span>
              <span>{formatRelativeTime(vod.startTime)}</span>
              {vod.duration && <span className="text-purple-400">{formatDuration(vod.duration)}</span>}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{vod.totalMessages.toLocaleString()}</div>
              <div className="text-gray-400">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{vod.uniqueViewers}</div>
              <div className="text-gray-400">Viewers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{vod.totalRedemptions}</div>
              <div className="text-gray-400">Redemptions</div>
            </div>
          </div>
        </div>
      </div>

      {/* VOD Embed */}
      {vodEmbedUrl && (
        <div className="mb-8">
          <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
            <iframe src={vodEmbedUrl} width="100%" height="100%" allowFullScreen title="VOD Player" />
          </div>
        </div>
      )}

      {/* Games played */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Games Played</h2>
        <div className="flex flex-wrap gap-2">
          {uniqueGames.map((game, index) => (
            <span key={index} className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-md border border-gray-700">
              {game}
            </span>
          ))}
        </div>
      </div>

      {/* Stream Segments */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Stream Segments ({vod.segments.length})</h2>
        <div className="space-y-3">
          {vod.segments.map((segment, index) => (
            <div key={segment.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-start gap-4">
                {/* Segment number */}
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0">{index + 1}</div>

                {/* Game box art */}
                {segment.gameBoxArtUrl && (
                  <div className="flex-shrink-0">
                    <Image src={segment.gameBoxArtUrl.replace("{width}", "52").replace("{height}", "72")} alt={segment.gameName} width={52} height={72} className="rounded" />
                  </div>
                )}

                {/* Segment info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white mb-1">{segment.title}</div>
                  <div className="text-sm text-purple-400 mb-1">{segment.gameName}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(segment.startTime).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {segment.endTime && (
                      <>
                        {" → "}
                        {new Date(segment.endTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
    </div>
  );
}
