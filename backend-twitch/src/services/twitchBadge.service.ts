import prisma from "../prismaClient";
import { getGlobalBadges, getChannelBadges } from "../twitch/api/twitchApi";
import { getUserId } from "../twitch/auth/authProviders";

/**
 * Updates the available badges in the database from Twitch API
 */
export async function updateAvailableBadges() {
  const streamerId = getUserId("streamer");
  const allGlobalBadges = await getGlobalBadges().catch(() => []);
  const allChannelBadges = await getChannelBadges(streamerId).catch(() => []);

  const globalResult = await syncBadges(allGlobalBadges);
  const channelResult = await syncBadges(allChannelBadges);

  return {
    global: globalResult.added + globalResult.updated,
    channel: channelResult.added + channelResult.updated,
  };
}

/**
 * Updates user badges based on their current badge set from chat message
 * Efficiently handles adding new badges and removing old ones
 * @param userId Database user ID
 * @param currentBadges Badge record from chat event (e.g., { broadcaster: '1', subscriber: '3060' })
 */
export async function updateUserBadges(userId: number, userLogin: string, currentBadges: Record<string, string>): Promise<void> {
  try {
    // Convert badge record to twitchIds format (setId_version)
    const currentBadgeIds = Object.entries(currentBadges).map(([setId, version]) => `${setId}_${version}`);

    // Get current user badges from database
    const existingUserBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    });

    const existingBadgeIds = existingUserBadges.map((ub) => ub.badge.twitchId);

    // Find badges to add and remove
    const badgesToAdd = currentBadgeIds.filter((id) => !existingBadgeIds.includes(id));
    const badgesToRemove = existingBadgeIds.filter((id) => !currentBadgeIds.includes(id));

    // Early return if no changes needed
    if (badgesToAdd.length === 0 && badgesToRemove.length === 0) {
      console.log(`[Badge] No changes for user ${userLogin}, skipping update`);
      return;
    }

    // Execute badge updates in a transaction
    await prisma.$transaction(async (tx) => {
      // Remove old badges
      if (badgesToRemove.length > 0) {
        const badgeIdsToRemove = existingUserBadges.filter((ub) => badgesToRemove.includes(ub.badge.twitchId)).map((ub) => ub.badgeId);

        await tx.userBadge.deleteMany({
          where: {
            userId,
            badgeId: { in: badgeIdsToRemove },
          },
        });
      }

      // Add new badges
      if (badgesToAdd.length > 0) {
        // Find badge records for the new badges
        const badgesToCreate = await tx.badge.findMany({
          where: { twitchId: { in: badgesToAdd } },
        });

        const userBadgeData = badgesToCreate.map((badge) => ({
          userId,
          badgeId: badge.id,
        }));

        if (userBadgeData.length > 0) {
          await tx.userBadge.createMany({
            data: userBadgeData,
            skipDuplicates: true,
          });
        }

        // Log warning for missing badges
        const foundBadgeIds = badgesToCreate.map((b) => b.twitchId);
        const missingBadges = badgesToAdd.filter((id) => !foundBadgeIds.includes(id));
        if (missingBadges.length > 0) {
          console.warn(`[Badge] Missing badges in database: ${missingBadges.join(", ")}`);
        }
      }
    });

    console.log(`[Badge] Updated badges for user ${userLogin}: +${badgesToAdd.length} -${badgesToRemove.length}`);
  } catch (error) {
    console.error(`[Badge] Error updating badges for user ${userLogin}:`, error);
  }
}

async function syncBadges(badgeSets: any[]) {
  // Flatten all badge versions from all sets
  const allBadgeVersions: any[] = [];
  for (const badgeSet of badgeSets) {
    for (const version of badgeSet.versions) {
      allBadgeVersions.push({
        twitchId: `${badgeSet.id}_${version.id}`,
        setId: badgeSet.id,
        version: version.id,
        title: version.title,
        description: version.description,
        imageUrl: version.getImageUrl(4), // 4x resolution
      });
    }
  }

  const dbBadges = await prisma.badge.findMany();
  const dbBadgeMap = new Map(dbBadges.map((b) => [`${b.setId}_${b.version}`, b]));

  const toCreate: any[] = [];
  const toUpdate: { setId: string; version: string; data: any }[] = [];

  for (const badgeVersion of allBadgeVersions) {
    const dbBadge = dbBadgeMap.get(`${badgeVersion.setId}_${badgeVersion.version}`);
    const badgeData = {
      title: badgeVersion.title,
      description: badgeVersion.description,
      imageUrl: badgeVersion.imageUrl,
    };

    if (!dbBadge) {
      toCreate.push({
        twitchId: badgeVersion.twitchId,
        setId: badgeVersion.setId,
        version: badgeVersion.version,
        ...badgeData,
      });
    } else {
      const needsUpdate = dbBadge.title !== badgeData.title || dbBadge.description !== badgeData.description || dbBadge.imageUrl !== badgeData.imageUrl;
      if (needsUpdate) {
        toUpdate.push({
          setId: badgeVersion.setId,
          version: badgeVersion.version,
          data: badgeData,
        });
      }
    }
  }

  let added = 0;
  let updated = 0;

  if (toCreate.length > 0) {
    await prisma.badge.createMany({ data: toCreate, skipDuplicates: true });
    added = toCreate.length;
  }

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((item) =>
        prisma.badge.update({
          where: {
            setId_version: {
              setId: item.setId,
              version: item.version,
            },
          },
          data: item.data,
        })
      )
    );
    updated = toUpdate.length;
  }

  return { added, updated };
}
