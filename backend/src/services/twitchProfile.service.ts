import prisma from "../prismaClient";
import { HelixUser } from "@twurple/api";
import { getUserId } from "../twitch/auth/authProviders";
import { isUserVip, isUserModerator } from "../twitch/api/twitchApi";

/**
 * Updates or creates a TwitchProfile for a user with fresh data from Twitch API
 * @param userId Database user ID
 * @param twitchUser HelixUser object from Twitch API containing user data and methods
 * @returns Updated TwitchProfile or null if update failed
 */
export async function upsertTwitchProfile(userId: number, twitchUser: HelixUser): Promise<any | null> {
  try {
    const streamerId = getUserId("streamer");

    // Extract successful results
    const followedChannel = await twitchUser.getChannelFollower(streamerId).catch(() => null);
    const activeSubscription = await twitchUser.getSubscriber(streamerId).catch(() => null);
    const isModerator = await isUserModerator(twitchUser.id, streamerId).catch(() => false);
    const isVip = await isUserVip(twitchUser.id, streamerId).catch(() => false);

    // Prepare TwitchProfile data - use broadcaster subscription data if available for more details
    const twitchProfileData = {
      isFollowing: !!followedChannel,
      followedSince: followedChannel?.followDate || null,
      isSubscribed: !!activeSubscription,
      subscriptionTier: activeSubscription?.tier || null,
      isModerator,
      isVip,
      lastUpdated: new Date(),
    };

    // Upsert the TwitchProfile
    const existingProfile = await prisma.twitchProfile.findUnique({
      where: { userId },
      include: { userBadges: true },
    });

    let twitchProfile;
    if (existingProfile) {
      twitchProfile = await prisma.twitchProfile.update({
        where: { userId },
        data: twitchProfileData,
        include: { userBadges: { include: { badge: true } } },
      });
    } else {
      twitchProfile = await prisma.twitchProfile.create({
        data: {
          userId,
          ...twitchProfileData,
        },
        include: { userBadges: { include: { badge: true } } },
      });
    }

    console.log(
      `[TwitchProfile] Updated profile for user ${twitchUser.displayName}: Follow: ${twitchProfileData.isFollowing}, Sub: ${twitchProfileData.isSubscribed}, Mod: ${twitchProfileData.isModerator}, VIP: ${twitchProfileData.isVip}`
    );

    return twitchProfile;
  } catch (error) {
    console.error(`[TwitchProfile] Error updating profile for user ${userId}:`, error);
    return null;
  }
}

/**
 * Returns TwitchProfile if exists and updated within specified time, otherwise null
 * @param userId Database user ID
 * @param maxAgeHours Maximum age in hours before considering profile stale (default: 24)
 */
export async function getTwitchProfileIfFresh(userId: number, maxAgeHours: number = 24): Promise<any | null> {
  const profile = await prisma.twitchProfile.findUnique({
    where: { userId },
    include: { userBadges: { include: { badge: true } } },
  });

  if (!profile) return null;

  const now = Date.now();
  const updated = profile.lastUpdated instanceof Date ? profile.lastUpdated.getTime() : new Date(profile.lastUpdated).getTime();
  const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds

  if (now - updated < maxAge) {
    return profile;
  }

  return null;
}
