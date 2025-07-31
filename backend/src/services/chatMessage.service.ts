import prisma from "../prismaClient";
import { upsertUserFromTwitch, getUserIfFresh } from "./user.service";
import { EventSubChannelChatMessageEvent } from "@twurple/eventsub-base";

export async function processChatMessageEvent(event: EventSubChannelChatMessageEvent) {
  let user = await getUserIfFresh(event.chatterId);
  if (!user) {
    console.log(`[EventSub] User not found or stale, fetching from Twitch: ${event.chatterId}`);
    const chatter = await event.getChatter();
    user = await upsertUserFromTwitch(chatter);
  } else {
    console.log(`[EventSub] Fresh user found: ${user.id}`);
    user = await prisma.user.findUnique({ where: { twitchId: event.chatterId }, select: { id: true } });
  }
  await prisma.message.create({
    data: {
      twitchId: event.messageId,
      content: event.messageText,
      userId: user.id,
      timestamp: new Date(),
    },
  });
}
