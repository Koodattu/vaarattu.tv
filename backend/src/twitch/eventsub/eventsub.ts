import { EventSubWsListener } from "@twurple/eventsub-ws";
import { ApiClient } from "@twurple/api";
import { getStreamerAuthProvider, getUserId } from "../auth/authProviders";
import { processStreamOnlineEvent, processStreamOfflineEvent, processChannelUpdateEvent } from "../../services/stream.service";

export async function startEventSubWs() {
  const authProvider = await getStreamerAuthProvider();
  const streamerChannel = getUserId("streamer");
  const apiClient = new ApiClient({ authProvider });
  const listener = new EventSubWsListener({ apiClient });

  // Sync channel point rewards and track stream/game on stream start
  listener.onStreamOnline(streamerChannel, async (event) => {
    try {
      await processStreamOnlineEvent(event, streamerChannel);
    } catch (err) {
      console.error("[EventSub] Failed to process stream online event:", err);
    }
  });

  // Track game/category/title changes
  listener.onChannelUpdate(streamerChannel, async (event) => {
    try {
      await processChannelUpdateEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process channel update event:", err);
    }
  });

  // Update stream end time on stream offline
  listener.onStreamOffline(streamerChannel, async (event) => {
    try {
      await processStreamOfflineEvent(event);
    } catch (err) {
      console.error("[EventSub] Failed to process stream offline event:", err);
    }
  });

  listener.onChannelRedemptionAdd(streamerChannel, (event) => {
    console.log("[EventSub] Channel Point Redemption:", event);
  });
  listener.onChannelSubscription(streamerChannel, (event) => {
    console.log("[EventSub] Subscription:", event);
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

  listener.onChannelChatMessage(streamerChannel, streamerChannel, (event) => {
    console.log("[EventSub] Chat Message:", event);
  });

  await listener.start();
  console.log("EventSub WebSocket listener started.");
}
