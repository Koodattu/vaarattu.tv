import prisma from "../prismaClient";
import { upsertUserFromTwitch } from "./user.service";
import { updateUserBadges } from "./twitchBadge.service";
import { trackEmoteUsage } from "./emote.service";
import { EventSubChannelChatMessageEvent } from "@twurple/eventsub-base";
import { streamState } from "./streamState.service";

export async function processChatMessageEvent(event: EventSubChannelChatMessageEvent) {
  // Only process messages during active streams
  const streamId = streamState.getCurrentStreamId();
  if (!streamId) {
    console.log(`[ChatMessage] Ignoring message from ${event.chatterName} - no active stream`);
    return;
  }

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
      streamId: streamId,
      timestamp: new Date(),
    },
  });

  // Update user badges based on current badge set from the message
  await updateUserBadges(user.id, user.login, event.badges);

  // Track emote usage in the message
  await trackEmoteUsage(user.id, event.messageText);

  console.log(`[ChatMessage] Processed message from ${event.chatterName} for stream ${streamId}`);
}
