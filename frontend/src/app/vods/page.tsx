"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StreamListItem } from "@/types/api";
import { apiClient } from "@/lib/api";
import { formatDate, formatDuration, formatRelativeTime } from "@/lib/utils";

export default function VodsPage() {
  const [vods, setVods] = useState<StreamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 12;

  useEffect(() => {
    const fetchVods = async () => {
      setLoading(true);
      const response = await apiClient.getStreams(page, limit);

      if (response.success && response.data) {
        setVods(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
        }
        setError(null);
      } else {
        setError(response.error || "Failed to load VODs");
      }
      setLoading(false);
    };

    fetchVods();
  }, [page]);

  // Get unique games from segments
  const getUniqueGames = (segments: StreamListItem["segments"]): string[] => {
    const games = segments.map((s) => s.gameName);
    return [...new Set(games)];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">VODs</h1>
        <p className="text-gray-400">Browse all past streams</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading VODs...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-2">Failed to load VODs</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && vods.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📺</div>
          <h2 className="text-xl font-semibold text-white mb-2">No VODs Yet</h2>
          <p className="text-gray-400">Stream data will appear here once it&apos;s collected.</p>
        </div>
      )}

      {!loading && !error && vods.length > 0 && (
        <>
          <div className="grid gap-4">
            {vods.map((vod) => {
              const uniqueGames = getUniqueGames(vod.segments);
              const firstSegment = vod.segments[0];

              return (
                <Link
                  key={vod.id}
                  href={`/vods/${vod.id}`}
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors border border-gray-700 hover:border-purple-600"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Date and Duration */}
                    <div className="md:w-48 flex-shrink-0">
                      <div className="text-lg font-semibold text-white">{formatDate(vod.startTime)}</div>
                      <div className="text-sm text-gray-400">{formatRelativeTime(vod.startTime)}</div>
                      {vod.duration && <div className="text-sm text-purple-400 mt-1">{formatDuration(vod.duration)}</div>}
                    </div>

                    {/* Title and Games */}
                    <div className="flex-1 min-w-0">
                      {firstSegment && <div className="text-white font-medium mb-2 truncate">{firstSegment.title}</div>}
                      <div className="flex flex-wrap gap-2">
                        {uniqueGames.slice(0, 4).map((game, index) => (
                          <span key={index} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                            {game}
                          </span>
                        ))}
                        {uniqueGames.length > 4 && <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">+{uniqueGames.length - 4} more</span>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex md:flex-col gap-4 md:gap-1 text-sm text-gray-400 md:text-right md:w-32 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <span>💬</span>
                        <span>{vod.totalMessages.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>👥</span>
                        <span>{vod.uniqueViewers}</span>
                      </div>
                      {vod.segments.length > 1 && (
                        <div className="flex items-center gap-1">
                          <span>📍</span>
                          <span>{vod.segments.length} segments</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <span className="text-gray-400 px-4">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-800 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
