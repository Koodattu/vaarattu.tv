import { EventSubWsListener } from "@twurple/eventsub-ws";
import { ApiClient } from "@twurple/api";
import { getStreamerAuthProvider, getUserId } from "../auth/authProviders";
import { processStreamOnlineEvent, processStreamOfflineEvent, processChannelUpdateEvent } from "../../services/stream.service";
import { processChatMessageEvent } from "../../services/chatMessage.service";
import { processChannelRedemptionEvent } from "../../services/channelRedemption.service";
import { processCheerEvent, processSubscriptionGiftEvent } from "../../services/supportEvent.service";
import { processFollowEvent, processSubscriptionEndEvent, processSubscriptionEvent, processSubscriptionStartEvent } from "../../services/twitchProfile.service";

export async function startEventSubWs() {
  const authProvider = await getStreamerAuthProvider();
  const streamerChannel = getUserId("streamer");
  const apiClient = new ApiClient({ authProvider });
  const listener = new EventSubWsListener({ apiClient });

  // Sync channel point rewards and track stream/game on stream start
  listener.onStreamOnline(streamerChannel, async (event) => {
    try {
      console.log("[EventSub] Stream online event received!");
      await processStreamOnlineEvent(event);
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
      console.log(`[EventSub] Channel point redemption received from ${event.userName} (${event.userId}), reward ${event.rewardTitle} (${event.rewardId})`);
      await processChannelRedemptionEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process channel point redemption:", err);
    }
  });

  listener.onChannelFollow(streamerChannel, streamerChannel, async (event) => {
    try {
      console.log(`[EventSub] Follow event received for ${event.userName} (${event.userId}) at ${event.followDate.toISOString()}`);
      await processFollowEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process follow:", err);
    }
  });

  listener.onChannelSubscription(streamerChannel, async (event) => {
    try {
      console.log(`[EventSub] Subscription event received for ${event.userName} (${event.userId}), tier ${event.tier}, gifted: ${event.isGift}`);
      await processSubscriptionStartEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process subscription:", err);
    }
  });

  listener.onChannelSubscriptionMessage(streamerChannel, async (event) => {
    try {
      console.log(`[EventSub] Subscription message received from ${event.userName} (${event.userId}), tier ${event.tier}, months ${event.cumulativeMonths}`);
      await processSubscriptionEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process subscription message:", err);
    }
  });

  listener.onChannelSubscriptionEnd(streamerChannel, async (event) => {
    try {
      console.log(`[EventSub] Subscription end event received for ${event.userName} (${event.userId}), tier ${event.tier}, gifted: ${event.isGift}`);
      await processSubscriptionEndEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process subscription end:", err);
    }
  });

  listener.onChannelSubscriptionGift(streamerChannel, async (event) => {
    try {
      console.log(`[EventSub] Subscription gift event received from ${event.gifterName ?? "anonymous"}, amount ${event.amount}, tier ${event.tier}`);
      await processSubscriptionGiftEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process subscription gift:", err);
    }
  });

  listener.onChannelCheer(streamerChannel, async (event) => {
    try {
      console.log(`[EventSub] Cheer event received from ${event.userName ?? "anonymous"}, bits ${event.bits}`);
      await processCheerEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process cheer:", err);
    }
  });

  listener.onChannelRaidTo(streamerChannel, (event) => {
    console.log(`[EventSub] Raid event received to ${event.raidedBroadcasterName} (${event.raidedBroadcasterId}) with ${event.viewers} viewers`);
  });

  await listener.start();
  console.log("EventSub WebSocket listener started.");
}
