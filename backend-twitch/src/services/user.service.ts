import prisma from "../prismaClient";
import { getUserInfoByUsername } from "../twitch/api/twitchApi";
import { upsertTwitchProfile } from "./twitchProfile.service";

/**
 * Returns user if exists and updated within 1 day, otherwise null.
 */
async function getUserIfFresh(login: string): Promise<any | null> {
  const user = await prisma.user.findUnique({
    where: { login },
    select: { id: true, login: true, displayName: true, updated: true },
  });
  if (!user) return null;
  const now = Date.now();
  const updated = user.updated instanceof Date ? user.updated.getTime() : new Date(user.updated).getTime();
  if (now - updated < 24 * 60 * 60 * 1000) {
    return user;
  }
  return null;
}

/**
 * Upserts a Twitch user in the database by their Twitch ID.
 * Only updates if user is missing or last updated >1 day ago.
 * If displayName changes, adds a NameHistory record for the previous value.
 */
export async function upsertUserFromTwitch(login: string): Promise<any | null> {
  let existingUser = await getUserIfFresh(login);
  if (existingUser) {
    console.log(`[EventSub] Fresh user found: ${existingUser.displayName}`);
    return existingUser;
  }

  console.log(`[EventSub] User not found or stale, fetching from Twitch: ${login}`);
  const twitchUser = await getUserInfoByUsername(login);

  if (!twitchUser) {
    console.warn(`[EventSub] Twitch user not found: ${login}`);
    return null;
  }

  const now = new Date();
  if (!existingUser) {
    // Create new user
    const newUser = await prisma.user.create({
      data: { twitchId: twitchUser.id, login: twitchUser.name, displayName: twitchUser.displayName, avatar: twitchUser.profilePictureUrl, updated: now },
    });

    // Create TwitchProfile for new user
    await upsertTwitchProfile(newUser.id, twitchUser);

    return newUser;
  }

  const updated = existingUser.updated instanceof Date ? existingUser.updated.getTime() : new Date(existingUser.updated).getTime();
  if (Date.now() - updated < 24 * 60 * 60 * 1000) {
    // User is fresh, return minimal user object (id only)
    return { id: existingUser.id };
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
    where: { twitchId: twitchUser.id },
    data: { login: twitchUser.name, displayName: twitchUser.displayName, avatar: twitchUser.profilePictureUrl, updated: now },
  });

  // Update TwitchProfile data (follow status, subscription, badges, etc.)
  await upsertTwitchProfile(updatedUser.id, twitchUser);

  return updatedUser;
}
