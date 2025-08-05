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
