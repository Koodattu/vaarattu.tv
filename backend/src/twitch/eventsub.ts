import { EventSubWsListener } from "@twurple/eventsub-ws";
import { ApiClient } from "@twurple/api";
import { getStreamerAuthProvider } from "./authProviders";
import path from "path";
import fs from "fs";

export async function startEventSubWs() {
  const authProvider = await getStreamerAuthProvider();
  // Read userId directly from streamer tokens file
  const tokenDataPath = path.join(__dirname, "../../tokens.streamer.json");
  const tokenData = JSON.parse(fs.readFileSync(tokenDataPath, "utf-8"));
  const userId = tokenData.id;
  if (!userId) {
    throw new Error("Streamer userId not found in tokens.streamer.json");
  }
  const apiClient = new ApiClient({ authProvider });
  const listener = new EventSubWsListener({ apiClient });

  listener.onChannelSubscription(userId, (event) => {
    console.log("[EventSub] Subscription:", event);
  });
  listener.onChannelSubscriptionGift(userId, (event) => {
    console.log("[EventSub] Subscription Gift:", event);
  });
  listener.onChannelCheer(userId, (event) => {
    console.log("[EventSub] Cheer:", event);
  });
  listener.onChannelRaidTo(userId, (event: any) => {
    console.log("[EventSub] Raid:", event);
  });
  listener.onChannelRedemptionAdd(userId, (event) => {
    console.log("[EventSub] Channel Point Redemption:", event);
  });

  await listener.start();
  console.log("EventSub WebSocket listener started.");
}
