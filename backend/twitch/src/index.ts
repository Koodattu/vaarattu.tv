import dotenv from "dotenv";
const envPath = process.env.NODE_ENV === "production" ? ".env" : "../.env";
dotenv.config({ path: envPath, quiet: true });

import { tryCreateChatClient } from "./twitch/api/chat";
import { startEventSubWs } from "./twitch/api/eventsub";
import { startTwitchAuthServer } from "./twitch/auth/dualAuthServer";
import { getTokenPaths } from "./twitch/auth/authProviders";
import { refreshChannelMetadata } from "./services/channelMetadata.service";
import { runBackgroundTask } from "./services/backgroundTask";
import { testOpenAIConnection } from "./services/openai.service";
import { startStreamStatusPolling } from "./twitch/api/streamPolling.service";
import fs from "fs";
import { startYoutubeSync } from "./services/youtube.service";
import prisma from "./prismaClient";
import { registerChatHandlers } from "./twitch/api/chatHandlers";

export async function start() {
  // Check DB connection before anything else
  try {
    await prisma.$connect();
    console.log("Database connected successfully.");
  } catch (err) {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  }
  const tokens = getTokenPaths();
  let collecting = false;
  let botStarted = false;
  const startAvailableServices = () => {
    if (!fs.existsSync(tokens.streamer)) return;
    if (!collecting) {
      collecting = true;
      startStreamStatusPolling();
      runBackgroundTask("EventSub", startEventSubWs);
      refreshChannelMetadata();
    }
    if (!botStarted && fs.existsSync(tokens.bot)) {
      botStarted = true;
      runBackgroundTask("Twitch bot", async () => {
        const chatClient = await tryCreateChatClient();
        registerChatHandlers(chatClient);
        await chatClient.connect();
        console.log("Twitch chat client connected and listening.");
      });
    }
  };

  startAvailableServices();
  runBackgroundTask("YouTube", startYoutubeSync);
  runBackgroundTask("OpenAI", testOpenAIConnection);

  for (const account of ["streamer", "bot"] as const) {
    if (fs.existsSync(tokens[account])) continue;
    console.error(account === "streamer"
      ? `Stream collection is blocked: streamer tokens are missing at ${tokens.streamer}. Complete streamer OAuth.`
      : `Twitch bot is unavailable: tokens are missing at ${tokens.bot}. Streamer collection can run without the bot.`);
    startTwitchAuthServer(account, startAvailableServices);
  }
}

if (require.main === module) void start();
