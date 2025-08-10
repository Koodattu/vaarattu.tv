import { ChatClient, ChatMessage } from "@twurple/chat";
import { handleUserJoin, handleUserPart } from "../../services/viewSession.service";
import { streamState } from "../../services/streamState.service";

export function registerChatHandlers(chatClient: ChatClient) {
  /*chatClient.onMessage((channel, user, message, msg: ChatMessage) => {
    console.log(`[onMessage] [${channel}] <${user}>: ${message}`);

    if (msg.isRedemption) {
      console.log(`[onRedemption] [${channel}] <${user}> redeemed: ${msg.rewardId}`);
      return;
    }

    if (msg.isCheer) {
      console.log(`[onCheer] [${channel}] <${user}> cheered: ${msg.bits} bits`);
    }

    if (msg.isFirst) {
      console.log(`[onFirstMessage] [${channel}] <${user}> sent their first message!`);
    }
  });*/

  chatClient.onJoin((channel, user) => {
    // Only process joins during active streams
    const streamId = streamState.getCurrentStreamId();
    if (!streamId) {
      console.log(`[onJoin] Ignoring join for ${user} - no active stream`);
      return;
    }

    console.log(`[onJoin] [${channel}] ${user} joined during stream ${streamId}`);
    // Handle the join asynchronously to avoid blocking the chat client
    handleUserJoin(user, streamId).catch((error) => {
      console.error(`[onJoin] Error handling join for ${user}:`, error);
    });
  });

  chatClient.onPart((channel, user) => {
    // Only process parts during active streams
    const streamId = streamState.getCurrentStreamId();
    if (!streamId) {
      console.log(`[onPart] Ignoring part for ${user} - no active stream`);
      return;
    }

    console.log(`[onPart] [${channel}] ${user} left during stream ${streamId}`);
    // Handle the part asynchronously to avoid blocking the chat client
    handleUserPart(user, streamId).catch((error) => {
      console.error(`[onPart] Error handling part for ${user}:`, error);
    });
  });
}
