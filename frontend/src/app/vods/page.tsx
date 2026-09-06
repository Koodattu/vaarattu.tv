"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { StreamListItem } from "@/types/api";
import { apiClient } from "@/lib/api";
import { formatDate, formatDuration, formatRelativeTime } from "@/lib/utils";

export default function VodsPage() {
  const [vods, setVods] = useState<StreamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(new Set());
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vods.map((vod) => {
              const uniqueGames = getUniqueGames(vod.segments);
              const firstSegment = vod.segments[0];
              const thumbnailUrl = vod.thumbnailUrl?.replace(/%?\{width\}/g, "640").replace(/%?\{height\}/g, "360");

              return (
                <Link
                  key={vod.id}
                  href={`/vods/${vod.id}`}
                  className="group flex flex-col overflow-hidden bg-gray-800 rounded-lg transition-colors border border-gray-700 hover:border-purple-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-500"
                >
                  <div className="relative aspect-video overflow-hidden bg-gray-700">
                    {thumbnailUrl && !failedThumbnails.has(thumbnailUrl) ? (
                      <Image
                        src={thumbnailUrl}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover transition-transform motion-safe:group-hover:scale-105"
                        onError={() => setFailedThumbnails((failed) => new Set(failed).add(thumbnailUrl))}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900" aria-hidden="true">
                        <svg className="h-12 w-12 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="5" width="18" height="14" rx="3" />
                          <path d="m10 9 5 3-5 3V9Z" />
                        </svg>
                      </div>
                    )}
                    <span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-xs font-medium text-white">{formatDuration(vod.duration)}</span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4 min-w-0">
                    <div>
                      <h2 className="line-clamp-2 text-white font-medium group-hover:text-purple-400 transition-colors">{firstSegment?.title || formatDate(vod.startTime)}</h2>
                      <div className="text-sm text-gray-400 mt-1">{formatDate(vod.startTime)}</div>
                      <div className="text-xs text-gray-500 mt-1">{formatRelativeTime(vod.startTime)}</div>
                    </div>
                    <div>
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
                    <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-700 pt-3 text-xs text-gray-400">
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
