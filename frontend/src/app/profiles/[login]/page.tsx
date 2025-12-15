"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { UserProfile } from "@/types/api";
import { apiClient } from "@/lib/api";
import { formatDuration, formatRelativeTime, formatDate } from "@/lib/utils";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <tr className="border-b border-gray-700">
      <th className="text-left text-gray-400 py-2 pr-4 font-medium text-sm whitespace-nowrap">{label}</th>
      <td className="text-white py-2">{value}</td>
    </tr>
  );
}

function StatBadge({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-white font-bold">{value}</div>
      <div className="text-gray-500 text-xs">{label}</div>
    </div>
  );
}

function TopItemCard({ rank, name, imageUrl, subtitle, stat }: { rank: number; name: string; imageUrl?: string | null; subtitle?: string; stat: string }) {
  const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  return (
    <div className="flex items-center gap-3 bg-gray-700/30 rounded-lg p-2">
      <span className="text-lg">{rankEmoji}</span>
      {imageUrl && <Image src={imageUrl} alt={name} width={28} height={28} className="rounded object-contain" />}
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate">{name}</div>
        {subtitle && <div className="text-gray-500 text-xs">{subtitle}</div>}
      </div>
      <div className="text-gray-400 text-xs">{stat}</div>
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const login = params.login as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      const response = await apiClient.getUserProfileByLogin(login);

      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.error || "Failed to load profile");
      }

      setLoading(false);
    };

    fetchProfile();
  }, [login]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/profiles" className="text-purple-400 hover:text-purple-300 transition-colors mb-6 inline-block">
          ← Back to Profiles
        </Link>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <div className="text-6xl mb-4">😢</div>
          <p className="text-red-400 mb-2">Profile not found</p>
          <p className="text-gray-500 text-sm">{error || "User does not exist"}</p>
        </div>
      </div>
    );
  }

  // Build role badges
  const roles: string[] = [];
  if (profile.isModerator) roles.push("⚔️ Moderator");
  if (profile.isVip) roles.push("💎 VIP");
  if (profile.isSubscribed) roles.push("⭐ Subscriber");
  if (profile.isFollowing) roles.push("❤️ Follower");

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link href="/profiles" className="text-purple-400 hover:text-purple-300 transition-colors mb-6 inline-block">
        ← Back to Profiles
      </Link>

      {/* Wikipedia-style layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column - AI Summary / Bio */}
        <div className="flex-1 order-2 lg:order-1">
          {/* Mobile: Show header here */}
          <div className="lg:hidden mb-6">
            <div className="flex items-center gap-4 mb-4">
              {profile.avatar ? (
                <Image src={profile.avatar} alt={profile.displayName} width={80} height={80} className="rounded-full" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-3xl">👤</div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{profile.displayName}</h1>
                <p className="text-gray-500">@{profile.login}</p>
                {roles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {roles.map((role) => (
                      <span key={role} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title for desktop */}
          <h1 className="hidden lg:block text-3xl font-bold text-white mb-2">{profile.displayName}</h1>
          <p className="hidden lg:block text-gray-500 mb-6">@{profile.login}</p>

          {/* AI Summary */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📝</span> About
            </h2>
            {profile.aiSummary ? (
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{profile.aiSummary}</p>
                {profile.aiSummaryLastUpdate && <p className="text-gray-600 text-xs mt-4">Last updated {formatRelativeTime(profile.aiSummaryLastUpdate)}</p>}
              </div>
            ) : (
              <p className="text-gray-500 italic">No summary available yet. Check back after more chat activity!</p>
            )}
          </div>

          {/* Quick stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatBadge icon="💬" label="Messages" value={profile.totalMessages.toLocaleString()} />
            <StatBadge icon="⏱️" label="Watch Time" value={formatDuration(profile.totalWatchTime)} />
            <StatBadge icon="🎁" label="Redemptions" value={profile.totalRedemptions.toLocaleString()} />
            <StatBadge icon="💎" label="Points Spent" value={profile.totalPointsSpent.toLocaleString()} />
          </div>

          {/* Top items sections */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Top Emotes */}
            {profile.topEmotes.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Favorite Emotes</h3>
                <div className="space-y-2">
                  {profile.topEmotes.map((emote) => (
                    <TopItemCard key={emote.rank} rank={emote.rank} name={emote.name} imageUrl={emote.imageUrl} subtitle={emote.platform} stat={`${emote.usageCount}x`} />
                  ))}
                </div>
              </div>
            )}

            {/* Top Games */}
            {profile.topGames.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Top Games Watched</h3>
                <div className="space-y-2">
                  {profile.topGames.map((game) => (
                    <TopItemCard key={game.rank} rank={game.rank} name={game.name} imageUrl={game.boxArtUrl} stat={formatDuration(game.watchTime)} />
                  ))}
                </div>
              </div>
            )}

            {/* Top Rewards */}
            {profile.topRewards.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Favorite Rewards</h3>
                <div className="space-y-2">
                  {profile.topRewards.map((reward) => (
                    <TopItemCard
                      key={reward.rank}
                      rank={reward.rank}
                      name={reward.title}
                      imageUrl={reward.imageUrl}
                      subtitle={`${reward.cost} pts`}
                      stat={`${reward.redemptionCount}x`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Name History */}
          {profile.nameHistory.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mt-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Previous Names</h3>
              <div className="flex flex-wrap gap-2">
                {profile.nameHistory.map((history, index) => (
                  <span key={index} className="text-sm bg-gray-700 text-gray-300 px-3 py-1 rounded-full" title={`Changed on ${formatDate(history.detectedAt)}`}>
                    {history.previousName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Info Table (Wikipedia style) */}
        <div className="w-full lg:w-80 order-1 lg:order-2">
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden sticky top-4">
            {/* Desktop header image */}
            <div className="hidden lg:block bg-gradient-to-b from-purple-900/50 to-gray-800 p-6 text-center">
              {profile.avatar ? (
                <Image src={profile.avatar} alt={profile.displayName} width={120} height={120} className="rounded-full mx-auto mb-3 border-4 border-gray-700" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-4xl mx-auto mb-3 border-4 border-gray-600">👤</div>
              )}
              <h2 className="text-xl font-bold text-white">{profile.displayName}</h2>
              {roles.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {roles.map((role) => (
                    <span key={role} className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded">
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Info table */}
            <div className="p-4">
              <table className="w-full text-sm">
                <tbody>
                  <InfoRow label="Username" value={`@${profile.login}`} />
                  <InfoRow label="Total Messages" value={profile.totalMessages.toLocaleString()} />
                  <InfoRow label="Watch Time" value={formatDuration(profile.totalWatchTime)} />
                  <InfoRow label="Avg Session" value={profile.averageSessionTime > 0 ? formatDuration(profile.averageSessionTime) : null} />
                  <InfoRow label="Points Spent" value={profile.totalPointsSpent.toLocaleString()} />
                  <InfoRow label="Redemptions" value={profile.totalRedemptions.toLocaleString()} />
                  <InfoRow label="Last Seen" value={profile.lastSeen ? formatRelativeTime(profile.lastSeen) : null} />
                  {profile.topEmotes[0] && (
                    <InfoRow
                      label="Fav Emote"
                      value={
                        <span className="flex items-center gap-2">
                          {profile.topEmotes[0].imageUrl && <Image src={profile.topEmotes[0].imageUrl} alt={profile.topEmotes[0].name} width={20} height={20} className="inline" />}
                          {profile.topEmotes[0].name}
                        </span>
                      }
                    />
                  )}
                  {profile.topGames[0] && <InfoRow label="Fav Game" value={profile.topGames[0].name} />}
                  {profile.topRewards[0] && <InfoRow label="Fav Reward" value={profile.topRewards[0].title} />}
                </tbody>
              </table>
            </div>

            {/* View on Twitch link */}
            <div className="p-4 pt-0">
              <a
                href={`https://twitch.tv/${profile.login}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                View on Twitch
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
