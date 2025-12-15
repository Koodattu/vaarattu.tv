"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { StreamListItem } from "@/types/api";
import { apiClient } from "@/lib/api";
import { formatDate, formatDuration, formatRelativeTime } from "@/lib/utils";

export function RecentVods() {
  const [vods, setVods] = useState<StreamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVods = async () => {
      setLoading(true);
      const response = await apiClient.getStreams(1, 3);

      if (response.success && response.data) {
        setVods(response.data);
        setError(null);
      } else {
        setError(response.error || "Failed to load VODs");
      }
      setLoading(false);
    };

    fetchVods();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Recent VODs</h2>
        <Link href="/vods" className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium">
          View all →
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading VODs...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-400 mb-2">Failed to load VODs</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && vods.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No VODs available yet</p>
        </div>
      )}

      {!loading && !error && vods.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {vods.map((vod) => (
            <Link key={vod.id} href={`/vods/${vod.id}`} className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors group">
              {/* Thumbnail placeholder */}
              <div className="aspect-video bg-gray-700 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">🎮</span>
                </div>
                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">{formatDuration(vod.duration)}</div>
              </div>

              <div className="p-4">
                <div className="text-white font-medium mb-1 group-hover:text-purple-400 transition-colors">{formatDate(vod.startTime)}</div>
                <div className="text-gray-400 text-sm mb-2">{formatRelativeTime(vod.startTime)}</div>

                {/* Games played */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {vod.segments.slice(0, 2).map((segment, index) => (
                    <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                      {segment.gameName}
                    </span>
                  ))}
                  {vod.segments.length > 2 && <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">+{vod.segments.length - 2} more</span>}
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>💬 {vod.totalMessages.toLocaleString()}</span>
                  <span>👥 {vod.uniqueViewers}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
