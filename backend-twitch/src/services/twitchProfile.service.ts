import prisma from "../prismaClient";
import { HelixUser } from "@twurple/api";
import { getUserId } from "../twitch/auth/authProviders";
import { getUserInfoById, isUserVip, isUserModerator } from "../twitch/api/twitchApi";
import { EventSubChannelSubscriptionMessageEvent } from "@twurple/eventsub-base";
import { upsertUserFromTwitch } from "./user.service";

/**
 * Updates or creates a TwitchProfile for a user with fresh data from Twitch API
 * @param userId Database user ID
 * @param twitchUser HelixUser object from Twitch API containing user data and methods
 * @returns Updated TwitchProfile or null if update failed
 */
export async function upsertTwitchProfile(userId: number, twitchUser: HelixUser): Promise<any | null> {
  let existingProfile = await getTwitchProfileIfFresh(userId);
  if (existingProfile) {
    console.log(`[upsertTwitchProfile] Fresh profile found for user ${twitchUser.displayName}`);
    return existingProfile;
  }

  const streamerId = getUserId("streamer");

  // Extract successful results
  const broadcaster = await getUserInfoById(streamerId);
  const followedChannel = await broadcaster?.getChannelFollower(twitchUser.id);
  const activeSubscription = await broadcaster?.getSubscriber(twitchUser.id);
  const isModerator = await isUserModerator(streamerId, twitchUser.id);
  const isVip = await isUserVip(streamerId, twitchUser.id);

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

  if (existingProfile) {
    existingProfile = await prisma.twitchProfile.update({
      where: { userId },
      data: twitchProfileData,
    });
  } else {
    existingProfile = await prisma.twitchProfile.create({
      data: {
        userId,
        ...twitchProfileData,
      },
    });
  }

  console.log(`[TwitchProfile] Updated profile for user ${twitchUser.displayName}`);

  return existingProfile;
}

/**
 * Returns TwitchProfile if exists and updated within specified time, otherwise null
 * @param userId Database user ID
 */
async function getTwitchProfileIfFresh(userId: number): Promise<any | null> {
  const profile = await prisma.twitchProfile.findUnique({
    where: { userId },
  });

  if (!profile) return null;

  const now = Date.now();
  const updated = profile.lastUpdated instanceof Date ? profile.lastUpdated.getTime() : new Date(profile.lastUpdated).getTime();

  if (now - updated < 24 * 60 * 60 * 1000) {
    return profile;
  }
  return null;
}

export async function processSubscriptionEvent(event: EventSubChannelSubscriptionMessageEvent) {
  const user = await upsertUserFromTwitch(event.userName);
  if (!user) {
    console.warn(`[processSubscriptionEvent] User not found or stale, unable to process message: ${event.userName}`);
    return;
  }

  try {
    // Update TwitchProfile with subscription information
    await prisma.twitchProfile.upsert({
      where: { userId: user.id },
      update: {
        isSubscribed: true,
        subscriptionTier: event.tier,
        subscriptionMonths: event.cumulativeMonths,
        lastUpdated: new Date(),
      },
      create: {
        userId: user.id,
        isSubscribed: true,
        subscriptionTier: event.tier,
        subscriptionMonths: event.cumulativeMonths,
        lastUpdated: new Date(),
      },
    });

    console.log(`[processSubscriptionEvent] Updated subscription for ${event.userName}: Tier ${event.tier}, ${event.cumulativeMonths} months`);
  } catch (error) {
    console.error(`[processSubscriptionEvent] Error updating subscription for ${event.userName}:`, error);
  }
}
