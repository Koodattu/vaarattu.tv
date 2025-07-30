import { EventSubWsListener } from "@twurple/eventsub-ws";
import { ApiClient } from "@twurple/api";
import { getStreamerAuthProvider, getUserId } from "../auth/authProviders";

import { syncChannelPointRewards } from "../../services/channelReward.service";

export async function startEventSubWs() {
  const authProvider = await getStreamerAuthProvider();
  const streamerChannel = getUserId("streamer");
  const apiClient = new ApiClient({ authProvider });
  const listener = new EventSubWsListener({ apiClient });

  // Sync channel point rewards on stream start
  listener.onStreamOnline(streamerChannel, async (event) => {
    try {
      const result = await syncChannelPointRewards(streamerChannel);
      console.log(`[EventSub] Synced channel point rewards on stream start:`, result);
    } catch (err) {
      console.error("[EventSub] Failed to sync channel point rewards on stream start:", err);
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
