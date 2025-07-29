import { tryCreateChatClient } from "./twitch/chat";
import { registerChatHandlers } from "./twitch/chatHandlers";
import { startEventSubWs } from "./twitch/eventsub";
import { startTwitchAuthServer } from "./twitch/dualAuthServer";
import { getTokenPaths } from "./twitch/authProviders";
import { startChatPollingService } from "./twitch/chatPollingService";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

async function start() {
  const { streamer, bot } = getTokenPaths();
  let missing = [];
  if (!fs.existsSync(streamer)) missing.push("streamer");
  if (!fs.existsSync(bot)) missing.push("bot");

  if (missing.length > 0) {
    for (const account of missing) {
      startTwitchAuthServer(account as "streamer" | "bot");
    }
    console.log(`Waiting for OAuth for: ${missing.join(", ")}`);
    return;
  }

  try {
    const chatClient = await tryCreateChatClient();
    await chatClient.connect();
    console.log("Twitch chat client connected and listening.");
    registerChatHandlers(chatClient);
    await startEventSubWs();
    startChatPollingService();
  } catch (err) {
    if (err instanceof Error) {
      console.error("Failed to start Twitch services:", err.message);
    } else {
      console.error("Failed to start Twitch services:", err);
    }
  }
}

start();
