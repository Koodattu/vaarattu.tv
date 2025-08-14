"use client";

import { useState, useEffect } from "react";
import { StreamListItem } from "@/types/api";
import { apiClient } from "@/lib/api";
import { formatDate, formatDuration, formatRelativeTime } from "@/lib/utils";

interface StreamsListProps {
  onStreamSelect: (streamId: number) => void;
}

export function StreamsList({ onStreamSelect }: StreamsListProps) {
  const [streams, setStreams] = useState<StreamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStreams = async () => {
      setLoading(true);
      const response = await apiClient.getStreams(1, 50); // Get first 50 streams

      if (response.success && response.data) {
        setStreams(response.data);
        setError(null);
      } else {
        setError(response.error || "Failed to load streams");
      }
      setLoading(false);
    };

    fetchStreams();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Loading streams...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-2">❌ Error loading streams</div>
        <div className="text-gray-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Past Streams</h1>
        <p className="text-gray-600 dark:text-gray-300">Click on any stream to view its timeline and viewer activity</p>
      </div>

      <div className="space-y-4">
        {streams.map((stream) => (
          <div
            key={stream.id}
            onClick={() => onStreamSelect(stream.id)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{formatDate(stream.startTime)}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{formatRelativeTime(stream.startTime)}</span>
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-sm font-medium">
                    {formatDuration(stream.duration)}
                  </span>
                </div>

                {/* Stream segments */}
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Games played:</div>
                  <div className="flex flex-wrap gap-2">
                    {stream.segments.map((segment, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm">
                        {segment.gameName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stream stats */}
                <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <span>💬</span>
                    <span>{stream.totalMessages.toLocaleString()} messages</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>👥</span>
                    <span>{stream.uniqueViewers} unique viewers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>🎁</span>
                    <span>{stream.totalRedemptions} redemptions</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors">View Timeline →</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {streams.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400 mb-2">📺</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No streams found</h3>
          <p className="text-gray-600 dark:text-gray-400">Stream data will appear here once the bot starts collecting it.</p>
        </div>
      )}
    </div>
  );
}
