import prisma from "../prismaClient";
import { upsertUserFromTwitch } from "./user.service";
import { updateUserBadges } from "./twitchBadge.service";
import { trackEmoteUsage } from "./emote.service";
import { EventSubChannelChatMessageEvent } from "@twurple/eventsub-base";

export async function processChatMessageEvent(event: EventSubChannelChatMessageEvent) {
  const user = await upsertUserFromTwitch(event.chatterName);
  if (!user) {
    console.warn(`[EventSub] User not found or stale, unable to process message: ${event.chatterName}`);
    return;
  }

  // Process the message
  await prisma.message.create({
    data: {
      twitchId: event.messageId,
      content: event.messageText,
      userId: user.id,
      timestamp: new Date(),
    },
  });

  // Update user badges based on current badge set from the message
  await updateUserBadges(user.id, user.login, event.badges);

  // Track emote usage in the message
  await trackEmoteUsage(user.id, event.messageText);
}
