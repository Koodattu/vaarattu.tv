import { getChannelPointRewards } from "../twitch/api/twitchApi";
import prisma from "../prismaClient";

export async function syncChannelPointRewards(broadcasterId: string) {
  const twitchRewards = await getChannelPointRewards(broadcasterId);
  const dbRewards = await prisma.channelReward.findMany({ select: { id: true } });
  const dbRewardIds = new Set(dbRewards.map((r: { id: string }) => r.id));

  const newRewards = twitchRewards.filter((r) => !dbRewardIds.has(r.id));
  for (const reward of newRewards) {
    await prisma.channelReward.create({
      data: {
        id: reward.id,
        title: reward.title,
        cost: reward.cost,
        isEnabled: reward.isEnabled,
        imageUrl: reward.getImageUrl ? reward.getImageUrl(4) : null,
        backgroundColor: reward.backgroundColor ?? null,
      },
    });
  }
  return newRewards.length;
}
