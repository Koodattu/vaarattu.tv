import { ChatClient, ChatMessage } from "@twurple/chat";
import { handleUserJoin, handleUserPart } from "../../services/viewSession.service";

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
    console.log(`[onJoin] [${channel}] ${user} joined`);
    // Handle the join asynchronously to avoid blocking the chat client
    handleUserJoin(user).catch((error) => {
      console.error(`[onJoin] Error handling join for ${user}:`, error);
    });
  });

  chatClient.onPart((channel, user) => {
    console.log(`[onPart] [${channel}] ${user} left`);
    // Handle the part asynchronously to avoid blocking the chat client
    handleUserPart(user).catch((error) => {
      console.error(`[onPart] Error handling part for ${user}:`, error);
    });
  });
}
