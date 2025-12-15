import Link from "next/link";

export function ClipsTeaser() {
  // Placeholder data - will be replaced with API call
  const placeholderClips = [
    { id: 1, title: "Epic gaming moment", views: 1234 },
    { id: 2, title: "Hilarious reaction", views: 987 },
    { id: 3, title: "Amazing play", views: 765 },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">🎬 Featured Clips</h3>
        <Link href="/clips" className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium">
          View all →
        </Link>
      </div>

      <div className="space-y-3">
        {placeholderClips.map((clip) => (
          <div key={clip.id} className="flex items-center gap-4 py-2 border-b border-gray-700 last:border-0">
            {/* Thumbnail placeholder */}
            <div className="w-24 h-14 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🎥</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium truncate">{clip.title}</div>
              <div className="text-gray-400 text-sm">{clip.views.toLocaleString()} views</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 text-center">
        <Link href="/clips" className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors">
          Browse All Clips
        </Link>
      </div>
    </div>
  );
}
