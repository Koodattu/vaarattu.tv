import { getChannelChatters } from "./twitchApi";
import { getUserId } from "../auth/authProviders";
import { processViewerSessions } from "../../services/viewSession.service";
import { streamState } from "../../services/streamState.service";

let pollingInterval: NodeJS.Timeout | null = null;

async function pollChatters() {
  // Only poll if stream is active
  const streamId = streamState.getCurrentStreamId();
  if (!streamId) {
    console.log("[ChatPolling] No active stream, skipping chatter poll");
    return;
  }

  const BROADCASTER_ID = getUserId("streamer");
  if (!BROADCASTER_ID) {
    console.error("Missing TWITCH_BROADCASTER_ID in .env");
    return;
  }
  try {
    const chatters = await getChannelChatters(BROADCASTER_ID);
    const usernames = chatters.map((c) => c.userName).join(", ");
    console.log(`[Chatters @ ${new Date().toISOString()}] Count: ${chatters.length}`);
    console.log(`Usernames: ${usernames}`);
    await processViewerSessions(chatters, streamId);
  } catch (err) {
    console.error("Failed to fetch chatters:", err);
  }
}

export function startChatPollingService() {
  if (pollingInterval) {
    console.log("[ChatPolling] Polling already active, skipping start");
    return;
  }
  console.log("[ChatPolling] Starting chatter polling service");
  pollingInterval = setInterval(pollChatters, 300_000);
  pollChatters(); // Poll immediately
}

export function stopChatPollingService() {
  if (pollingInterval) {
    console.log("[ChatPolling] Stopping chatter polling service");
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}
