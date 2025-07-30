import prisma from "../prismaClient";

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
export async function upsertUserFromTwitch(twitchId: string, login: string, displayName: string, avatar?: string) {
  // Fetch user with all needed fields
  const existingUser = await prisma.user.findUnique({
    where: { twitchId },
    select: { id: true, login: true, displayName: true, updated: true },
  });

  const now = new Date();
  if (!existingUser) {
    // Create new user
    return prisma.user.create({
      data: { twitchId, login, displayName, avatar, updated: now },
    });
  }

  const updated = existingUser.updated instanceof Date ? existingUser.updated.getTime() : new Date(existingUser.updated).getTime();
  if (Date.now() - updated < 24 * 60 * 60 * 1000) {
    // User is fresh, return minimal user object (id only)
    return { id: existingUser.id };
  }

  // Collect name history changes
  const nameHistoryEntries = [];
  if (existingUser.displayName !== displayName) {
    nameHistoryEntries.push({
      userId: existingUser.id,
      previousName: existingUser.displayName,
      detectedAt: now,
    });
  }
  if (existingUser.login !== login) {
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
    where: { twitchId },
    data: { login, displayName, avatar, updated: now },
  });
}
