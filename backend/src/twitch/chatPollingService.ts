import { getChannelChatters } from "./twitchApi";
import { getUserId } from "./authProviders";

async function pollChatters() {
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
  } catch (err) {
    console.error("Failed to fetch chatters:", err);
  }
}

export function startChatPollingService() {
  setInterval(pollChatters, 300_000);
  pollChatters();
}
