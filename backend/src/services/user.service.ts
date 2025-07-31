import prisma from "../prismaClient";
import { getUserInfoById } from "../twitch/api/twitchApi";

/**
 * Returns user if exists and updated within 1 day, otherwise null.
 */
export async function getUserIfFresh(twitchId: string): Promise<any | null> {
  const user = await prisma.user.findUnique({
    where: { twitchId },
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
export async function upsertUserFromTwitch(twitchId: string): Promise<any | null> {
  let dbUser = await getUserIfFresh(twitchId);
  if (dbUser) {
    console.log(`[EventSub] Fresh user found: ${dbUser.id}`);
    dbUser = await prisma.user.findUnique({ where: { twitchId: twitchId }, select: { id: true } });
    return dbUser;
  }

  console.log(`[EventSub] User not found or stale, fetching from Twitch: ${twitchId}`);
  const twitchUser = await getUserInfoById(twitchId);

  if (!twitchUser) {
    console.warn(`[EventSub] Twitch user not found: ${twitchId}`);
    return null;
  }

  // Fetch user with all needed fields
  const existingUser = await prisma.user.findUnique({
    where: { twitchId: twitchUser.id },
    select: { id: true, login: true, displayName: true, updated: true },
  });

  const now = new Date();
  if (!existingUser) {
    // Create new user
    return prisma.user.create({
      data: { twitchId: twitchUser.id, login: twitchUser.name, displayName: twitchUser.displayName, avatar: twitchUser.profilePictureUrl, updated: now },
    });
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
  return prisma.user.update({
    where: { twitchId: twitchUser.id },
    data: { login: twitchUser.name, displayName: twitchUser.displayName, avatar: twitchUser.profilePictureUrl, updated: now },
  });
}
