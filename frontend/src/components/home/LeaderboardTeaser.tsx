import Link from "next/link";

export function LeaderboardTeaser() {
  // Placeholder data - will be replaced with API call
  const placeholderLeaders = [
    { rank: 1, name: "TopChatter", value: "12,345 messages" },
    { rank: 2, name: "ChatKing", value: "10,234 messages" },
    { rank: 3, name: "StreamFan", value: "8,765 messages" },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">🏆 Top Chatters</h3>
        <Link href="/leaderboards" className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium">
          View all →
        </Link>
      </div>

      <div className="space-y-3">
        {placeholderLeaders.map((leader) => (
          <div key={leader.rank} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
            <div className="flex items-center gap-3">
              <span
                className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold ${
                  leader.rank === 1 ? "bg-yellow-500 text-black" : leader.rank === 2 ? "bg-gray-400 text-black" : "bg-amber-700 text-white"
                }`}
              >
                {leader.rank}
              </span>
              <span className="text-white font-medium">{leader.name}</span>
            </div>
            <span className="text-gray-400 text-sm">{leader.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 text-center">
        <Link href="/leaderboards" className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors">
          View Full Leaderboards
        </Link>
      </div>
    </div>
  );
}
