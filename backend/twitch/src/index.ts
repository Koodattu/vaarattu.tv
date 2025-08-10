import dotenv from "dotenv";
const envPath = process.env.NODE_ENV === "production" ? ".env" : "../.env";
dotenv.config({ path: envPath, quiet: true });

import { tryCreateChatClient } from "./twitch/api/chat";
import { startEventSubWs } from "./twitch/api/eventsub";
import { startTwitchAuthServer } from "./twitch/auth/dualAuthServer";
import { getTokenPaths } from "./twitch/auth/authProviders";
import { syncChannelPointRewards } from "./services/channelReward.service";
import { updateAvailableBadges } from "./services/twitchBadge.service";
import { initializeEmotes } from "./services/emote.service";
import { testOpenAIConnection } from "./services/openai.service";
import fs from "fs";
import prisma from "./prismaClient";
import { registerChatHandlers } from "./twitch/api/chatHandlers";

async function start() {
  // Check DB connection before anything else
  try {
    await prisma.$connect();
    console.log("Database connected successfully.");
  } catch (err) {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  }
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
    // Test OpenAI connection
    await testOpenAIConnection();

    await syncChannelPointRewards();
    await updateAvailableBadges();
    await initializeEmotes();

    const chatClient = await tryCreateChatClient();
    chatClient.connect();
    console.log("Twitch chat client connected and listening.");
    registerChatHandlers(chatClient);
    await startEventSubWs();

    // Note: Chatter polling is now managed by the stream state manager
    console.log("All Twitch services initialized successfully.");
  } catch (err) {
    if (err instanceof Error) {
      console.error("Failed to start Twitch services:", err.message);
    } else {
      console.error("Failed to start Twitch services:", err);
    }
  }
}

start();
