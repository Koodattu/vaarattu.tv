import { ChatClient, ChatMessage } from "@twurple/chat";

/**
 * Register all chat event handlers for the bot.
 * Keep all chat-related logic here.
 */
export function registerChatHandlers(chatClient: ChatClient) {
  chatClient.onMessage((channel, user, message, msg: ChatMessage) => {
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
  });
  chatClient.onJoin((channel, user) => {
    console.log(`[onJoin] [${channel}] ${user} joined`);
  });
  chatClient.onPart((channel, user) => {
    console.log(`[onPart] [${channel}] ${user} left`);
  });
}
