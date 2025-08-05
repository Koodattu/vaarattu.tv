import prisma from "../prismaClient";
import { upsertUserFromTwitch } from "./user.service";
import { EventSubChannelRedemptionAddEvent } from "@twurple/eventsub-base";

export async function processChannelRedemptionEvent(event: EventSubChannelRedemptionAddEvent) {
  const user = await upsertUserFromTwitch(event.userName);
  if (!user) {
    console.warn(`[EventSub] User not found or stale, unable to process message: ${event.userName}`);
    return;
  }

  // Ensure ChannelReward exists
  let channelReward = await prisma.channelReward.findUnique({ where: { twitchId: event.rewardId } });
  if (!channelReward) {
    const reward = await event.getReward();
    channelReward = await prisma.channelReward.create({
      data: {
        twitchId: reward.id,
        title: reward.title,
        cost: reward.cost,
        isEnabled: reward.isEnabled,
        imageUrl: reward.getImageUrl ? reward.getImageUrl(4) : undefined,
        backgroundColor: reward.backgroundColor,
      },
    });
    console.log(`[EventSub] Created new ChannelReward: ${reward.title} (${reward.id})`);
  }

  await prisma.redemption.create({
    data: {
      twitchId: event.id,
      userId: user.id,
      rewardId: event.rewardId,
      timestamp: event.redemptionDate,
      customText: event.input || undefined,
    },
  });
}
