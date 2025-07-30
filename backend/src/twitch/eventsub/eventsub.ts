import { EventSubWsListener } from "@twurple/eventsub-ws";
import { ApiClient } from "@twurple/api";
import { getStreamerAuthProvider, getUserId } from "../auth/authProviders";

export async function startEventSubWs() {
  const authProvider = await getStreamerAuthProvider();
  const streamerChannel = getUserId("streamer");
  const apiClient = new ApiClient({ authProvider });
  const listener = new EventSubWsListener({ apiClient });

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
