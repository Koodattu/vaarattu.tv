import { EventSubWsListener } from "@twurple/eventsub-ws";
import { ApiClient } from "@twurple/api";
import { getStreamerAuthProvider, getUserId } from "../auth/authProviders";
import { processStreamOnlineEvent, processStreamOfflineEvent, processChannelUpdateEvent } from "../../services/stream.service";
import { processChatMessageEvent } from "../../services/chatMessage.service";
import { processChannelRedemptionEvent } from "../../services/channelRedemption.service";
import { processSubscriptionEvent } from "../../services/twitchProfile.service";

export async function startEventSubWs() {
  const authProvider = await getStreamerAuthProvider();
  const streamerChannel = getUserId("streamer");
  const apiClient = new ApiClient({ authProvider });
  const listener = new EventSubWsListener({ apiClient });

  // Sync channel point rewards and track stream/game on stream start
  listener.onStreamOnline(streamerChannel, async (event) => {
    try {
      console.log("[EventSub] Stream online event received!");
      await processStreamOnlineEvent(event, streamerChannel);
    } catch (err) {
      console.error("[EventSub] Failed to process stream online event:", err);
    }
  });

  // Track game/category/title changes
  listener.onChannelUpdate(streamerChannel, async (event) => {
    try {
      console.log("[EventSub] Channel update event received!");
      await processChannelUpdateEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process channel update event:", err);
    }
  });

  // Update stream end time on stream offline
  listener.onStreamOffline(streamerChannel, async (event) => {
    try {
      console.log("[EventSub] Stream offline event received!");
      await processStreamOfflineEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process stream offline event:", err);
    }
  });

  // Listen for chat messages
  listener.onChannelChatMessage(streamerChannel, streamerChannel, async (event) => {
    try {
      console.log("[EventSub] Chat message event received: ", event.chatterName, event.messageText, event.badges);
      await processChatMessageEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process chat message event:", err);
    }
  });

  // Listen for channel point redemptions
  listener.onChannelRedemptionAdd(streamerChannel, async (event) => {
    try {
      console.log("[EventSub] Channel Point Redemption:", event);
      await processChannelRedemptionEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process channel point redemption:", err);
    }
  });

  listener.onChannelFollow(streamerChannel, streamerChannel, (event) => {
    console.log("[EventSub] Follow:", event);
  });

  listener.onChannelSubscription(streamerChannel, (event) => {
    console.log("[EventSub] Subscription:", event);
  });

  listener.onChannelSubscriptionMessage(streamerChannel, async (event) => {
    try {
      console.log("[EventSub] Subscription Message:", event);
      await processSubscriptionEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process subscription message:", err);
    }
  });

  listener.onChannelSubscriptionEnd(streamerChannel, (event) => {
    console.log("[EventSub] Subscription End:", event);
  });

  listener.onChannelSubscriptionGift(streamerChannel, (event) => {
    console.log("[EventSub] Subscription Gift:", event);
  });

  listener.onChannelCheer(streamerChannel, (event) => {
    console.log("[EventSub] Cheer:", event);
  });

  listener.onChannelRaidTo(streamerChannel, (event) => {
    console.log("[EventSub] Raid:", event);
  });

  await listener.start();
  console.log("EventSub WebSocket listener started.");
}
