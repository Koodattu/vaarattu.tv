import prisma from "../prismaClient";
import { HelixUser } from "@twurple/api";
import { getUserId } from "../twitch/auth/authProviders";
import { getChannelBadges, getGlobalBadges } from "../twitch/api/twitchApi";

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
    const followedChannel = await twitchUser.getFollowedChannel(streamerId).catch(() => null);
    const activeSubscription = await twitchUser.getSubscriptionTo(streamerId).catch(() => null);
    const isModerator = false; // Assume false by default, will be set later
    const isVip = false; // Assume false by default, will be set later
    const allGlobalBadges = await getGlobalBadges().catch(() => []);
    const allChannelBadges = await getChannelBadges(streamerId).catch(() => []);

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

    // Update badges - for now we'll store available badges but not assign them automatically
    // Badge assignment would require parsing chat messages to see which badges users actually have
    await updateAvailableBadges(allGlobalBadges, allChannelBadges);

    console.log(
      `[TwitchProfile] Updated profile for user ${userId}: Follow: ${twitchProfileData.isFollowing}, Sub: ${twitchProfileData.isSubscribed}, Mod: ${twitchProfileData.isModerator}, VIP: ${twitchProfileData.isVip}`
    );

    return twitchProfile;
  } catch (error) {
    console.error(`[TwitchProfile] Error updating profile for user ${userId}:`, error);
    return null;
  }
}

/**
 * Updates the available badges in the database from Twitch API
 * @param globalBadges Global badges from Twitch
 * @param channelBadges Channel-specific badges from Twitch
 */
async function updateAvailableBadges(globalBadges: any[], channelBadges: any[]) {
  try {
    const allBadges = [...globalBadges, ...channelBadges];

    for (const badgeSet of allBadges) {
      for (const version of badgeSet.versions) {
        await prisma.badge.upsert({
          where: {
            setId_version: {
              setId: badgeSet.id,
              version: version.id,
            },
          },
          update: {
            title: version.title,
            description: version.description,
            imageUrl: version.getImageUrl(1), // 1x resolution
          },
          create: {
            twitchId: `${badgeSet.id}_${version.id}`,
            setId: badgeSet.id,
            version: version.id,
            title: version.title,
            description: version.description,
            imageUrl: version.getImageUrl(1), // 1x resolution
          },
        });
      }
    }
  } catch (error) {
    console.error("[TwitchProfile] Error updating badges:", error);
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

/**
 * Assigns a badge to a user (called when parsing chat messages with badge info)
 * @param userId Database user ID
 * @param setId Badge set ID (e.g., "subscriber", "moderator")
 * @param version Badge version (e.g., "0", "1", "3000")
 */
export async function assignBadgeToUser(userId: number, setId: string, version: string): Promise<void> {
  try {
    // Find the badge
    const badge = await prisma.badge.findUnique({
      where: {
        setId_version: { setId, version },
      },
    });

    if (!badge) {
      console.warn(`[TwitchProfile] Badge not found: ${setId}/${version}`);
      return;
    }

    // Assign badge to user (upsert to avoid duplicates)
    await prisma.userBadge.upsert({
      where: {
        userId_badgeId: {
          userId,
          badgeId: badge.id,
        },
      },
      update: {}, // No fields to update
      create: {
        userId,
        badgeId: badge.id,
      },
    });
  } catch (error) {
    console.error(`[TwitchProfile] Error assigning badge ${setId}/${version} to user ${userId}:`, error);
  }
}
