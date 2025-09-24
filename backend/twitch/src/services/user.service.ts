import prisma from "../prismaClient";
import { getUserInfoByUsername } from "../twitch/api/twitchApi";
import { upsertTwitchProfile } from "./twitchProfile.service";

/**
 * Returns user if exists and is fresh (updated within 1 day),
 * or user with isFresh=false if exists but stale,
 * or null if doesn't exist at all.
 * First tries to find by login, then by twitchId (for username changes).
 */
async function getUserIfFresh(login: string): Promise<{ user: any; isFresh: boolean } | null> {
  // First try to find by current login
  let user = await prisma.user.findUnique({
    where: { login },
    select: { id: true, twitchId: true, login: true, displayName: true, updated: true },
  });

  // If not found by login, user might have changed username
  // Try to get their twitchId from Twitch API and look up by that
  if (!user) {
    const twitchUser = await getUserInfoByUsername(login);
    if (twitchUser) {
      user = await prisma.user.findUnique({
        where: { twitchId: twitchUser.id },
        select: { id: true, twitchId: true, login: true, displayName: true, updated: true },
      });
    }
  }

  if (!user) return null;

  const now = Date.now();
  const updated = user.updated instanceof Date ? user.updated.getTime() : new Date(user.updated).getTime();
  const isFresh = now - updated < 24 * 60 * 60 * 1000;

  return { user, isFresh };
}

/**
 * Upserts a Twitch user in the database by their Twitch ID.
 * Only updates if user is missing or last updated >1 day ago.
 * If displayName changes, adds a NameHistory record for the previous value.
 */
export async function upsertUserFromTwitch(login: string): Promise<any | null> {
  const userResult = await getUserIfFresh(login);

  if (userResult && userResult.isFresh) {
    // Check if this was found by twitchId (username change) vs login
    if (userResult.user.login !== login) {
      console.log(`[EventSub] Fresh user found with username change: ${userResult.user.login} → ${login}`);
    } else {
      console.log(`[EventSub] Fresh user found: ${userResult.user.displayName}`);
    }
    return userResult.user;
  }

  console.log(`[EventSub] User not found or stale, fetching from Twitch: ${login}`);
  const twitchUser = await getUserInfoByUsername(login);

  if (!twitchUser) {
    console.warn(`[EventSub] Twitch user not found: ${login}`);
    return null;
  }

  const now = new Date();

  if (!userResult) {
    // User doesn't exist, create new user
    console.log(`[EventSub] Creating new user: ${twitchUser.name} (${twitchUser.displayName})`);
    const newUser = await prisma.user.create({
      data: { twitchId: twitchUser.id, login: twitchUser.name, displayName: twitchUser.displayName, avatar: twitchUser.profilePictureUrl, updated: now },
    });

    // Create TwitchProfile for new user
    await upsertTwitchProfile(newUser.id, twitchUser);

    return newUser;
  }

  // User exists but is stale, update it
  const existingUser = userResult.user;

  // Check if this is a username change
  const isUsernameChange = existingUser.login !== twitchUser.name;
  if (isUsernameChange) {
    console.log(`[EventSub] Username change detected: ${existingUser.login} → ${twitchUser.name}`);
  } else {
    console.log(`[EventSub] Updating stale user: ${existingUser.login}`);
  }

  // Collect name history changes
  const nameHistoryEntries = [];
  if (existingUser.displayName !== twitchUser.displayName) {
    nameHistoryEntries.push({
      userId: existingUser.id,
      previousName: existingUser.displayName,
      detectedAt: now,
    });
  }
  if (existingUser.login !== twitchUser.name) {
    nameHistoryEntries.push({
      userId: existingUser.id,
      previousName: existingUser.login,
      detectedAt: now,
    });
  }
  if (nameHistoryEntries.length > 0) {
    await prisma.nameHistory.createMany({ data: nameHistoryEntries });
  }

  // Update user and return updated object
  const updatedUser = await prisma.user.update({
    where: { twitchId: existingUser.twitchId },
    data: { login: twitchUser.name, displayName: twitchUser.displayName, avatar: twitchUser.profilePictureUrl, updated: now },
  });

  // Update TwitchProfile data (follow status, subscription, badges, etc.)
  await upsertTwitchProfile(updatedUser.id, twitchUser);

  return updatedUser;
}
