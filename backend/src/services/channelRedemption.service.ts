import prisma from "../prismaClient";
import { upsertUserFromTwitch, getUserIfFresh } from "./user.service";
import { EventSubChannelRedemptionAddEvent } from "@twurple/eventsub-base";

export async function processChannelRedemptionEvent(event: EventSubChannelRedemptionAddEvent) {
  let user = await getUserIfFresh(event.userId);
  if (!user) {
    console.log(`[EventSub] User not found or stale, fetching from Twitch: ${event.userId}`);
    const twitchUser = await event.getUser();
    user = await upsertUserFromTwitch(event.userId, event.userName, event.userDisplayName, twitchUser.profilePictureUrl);
  } else {
    console.log(`[EventSub] Fresh user found: ${user.id}`);
    user = await prisma.user.findUnique({ where: { twitchId: event.userId }, select: { id: true } });
  }

  // Ensure ChannelReward exists
  let channelReward = await prisma.channelReward.findUnique({ where: { id: event.rewardId } });
  if (!channelReward) {
    const reward = await event.getReward();
    channelReward = await prisma.channelReward.create({
      data: {
        id: reward.id,
        title: reward.title,
        cost: reward.cost,
        isEnabled: reward.isEnabled,
        imageUrl: reward.getImageUrl ? reward.getImageUrl(1) : undefined,
        backgroundColor: reward.backgroundColor,
      },
    });
    console.log(`[EventSub] Created new ChannelReward: ${reward.title} (${reward.id})`);
  }

  await prisma.redemption.create({
    data: {
      twitchRedemptionId: event.id,
      userId: user.id,
      rewardId: event.rewardId,
      timestamp: event.redemptionDate,
      customText: event.input || undefined,
    },
  });
}
