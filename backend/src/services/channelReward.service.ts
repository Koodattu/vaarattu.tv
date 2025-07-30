import prisma from "../prismaClient";
import { getChannelPointRewards } from "../twitch/api/twitchApi";
import type { ChannelReward } from "@prisma/client";

export async function syncChannelPointRewards(broadcasterId: string) {
  const twitchRewards = await getChannelPointRewards(broadcasterId);
  const dbRewards: ChannelReward[] = await prisma.channelReward.findMany();
  const dbRewardMap = new Map<string, ChannelReward>(dbRewards.map((r) => [r.id, r]));

  const toCreate: any[] = [];
  const toUpdate: { id: string; data: any }[] = [];

  for (const reward of twitchRewards) {
    const dbReward = dbRewardMap.get(reward.id);
    const rewardData = {
      title: reward.title,
      cost: reward.cost,
      isEnabled: reward.isEnabled,
      imageUrl: reward.getImageUrl ? reward.getImageUrl(4) : null,
      backgroundColor: reward.backgroundColor ?? null,
    };
    if (!dbReward) {
      toCreate.push({
        id: reward.id,
        ...rewardData,
      });
    } else {
      const needsUpdate =
        dbReward.title !== rewardData.title ||
        dbReward.cost !== rewardData.cost ||
        dbReward.isEnabled !== rewardData.isEnabled ||
        dbReward.imageUrl !== rewardData.imageUrl ||
        dbReward.backgroundColor !== rewardData.backgroundColor;
      if (needsUpdate) {
        toUpdate.push({ id: reward.id, data: rewardData });
      }
    }
  }

  let added = 0;
  let updated = 0;

  if (toCreate.length > 0) {
    await prisma.channelReward.createMany({ data: toCreate, skipDuplicates: true });
    added = toCreate.length;
  }

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map((item) => prisma.channelReward.update({ where: { id: item.id }, data: item.data }))
    );
    updated = toUpdate.length;
  }

  return { added, updated };
}
