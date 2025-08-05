import { tryCreateChatClient } from "./twitch/api/chat";
import { startEventSubWs } from "./twitch/api/eventsub";
import { startTwitchAuthServer } from "./twitch/auth/dualAuthServer";
import { getTokenPaths, getUserId } from "./twitch/auth/authProviders";
import { syncChannelPointRewards } from "./services/channelReward.service";
import { startChatPollingService } from "./twitch/api/chatPollingService";
import fs from "fs";
import dotenv from "dotenv";
import prisma from "./prismaClient";
dotenv.config({ quiet: true });

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
    // Sync channel point rewards from Twitch to DB
    const broadcasterId = getUserId("streamer");
    const newRewards = await syncChannelPointRewards(broadcasterId);
    if (newRewards.added > 0 || newRewards.updated > 0) {
      console.log(`Added ${newRewards.added} and updated ${newRewards.updated} channel point rewards to DB.`);
    } else {
      console.log("Channel point rewards are up to date.");
    }

    const chatClient = await tryCreateChatClient();
    chatClient.connect();
    console.log("Twitch chat client connected and listening.");
    //registerChatHandlers(chatClient);
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
