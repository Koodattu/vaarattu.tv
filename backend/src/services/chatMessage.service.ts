import prisma from "../prismaClient";
import { upsertUserFromTwitch } from "./user.service";
import { EventSubChannelChatMessageEvent } from "@twurple/eventsub-base";

export async function processChatMessageEvent(event: EventSubChannelChatMessageEvent) {
  const user = await upsertUserFromTwitch(event.chatterId);
  if (!user) {
    console.warn(`[EventSub] User not found or stale, unable to process message: ${event.chatterId}`);
    return;
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
