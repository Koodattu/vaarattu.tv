import { RefreshingAuthProvider, type AccessToken } from "@twurple/auth";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const clientId = process.env.TWITCH_CLIENT_ID!;
const clientSecret = process.env.TWITCH_CLIENT_SECRET!;

const tokenPaths = {
  streamer: path.join(__dirname, "../../tokens.streamer.json"),
  bot: path.join(__dirname, "../../tokens.bot.json"),
};

let streamerAuthProvider: RefreshingAuthProvider | null = null;
let botAuthProvider: RefreshingAuthProvider | null = null;

export async function getStreamerAuthProvider() {
  if (streamerAuthProvider) return streamerAuthProvider;
  if (!fs.existsSync(tokenPaths.streamer)) {
    throw new Error("Streamer tokens not found. Please run the OAuth flow.");
  }
  const tokenData = JSON.parse(fs.readFileSync(tokenPaths.streamer, "utf-8"));
  if (!tokenData.accessToken || !tokenData.refreshToken || !tokenData.id) {
    throw new Error("Invalid streamer token data or missing user id.");
  }
  const provider = new RefreshingAuthProvider({ clientId, clientSecret });
  provider.onRefresh(async (_userId: string, newTokenData: AccessToken) => {
    fs.writeFileSync(tokenPaths.streamer, JSON.stringify({ ...newTokenData, id: tokenData.id }, null, 2));
    console.log("Streamer token refreshed");
  });
  await provider.addUser(
    tokenData.id,
    {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresIn: tokenData.expiresIn || null,
      obtainmentTimestamp: tokenData.obtainmentTimestamp || Date.now(),
      scope: tokenData.scope,
    },
    [] // no chat intent for streamer
  );
  streamerAuthProvider = provider;
  return provider;
}

export async function getBotAuthProvider() {
  if (botAuthProvider) return botAuthProvider;
  if (!fs.existsSync(tokenPaths.bot)) {
    throw new Error("Bot tokens not found. Please run the OAuth flow.");
  }
  const tokenData = JSON.parse(fs.readFileSync(tokenPaths.bot, "utf-8"));
  if (!tokenData.accessToken || !tokenData.refreshToken || !tokenData.id) {
    throw new Error("Invalid bot token data or missing user id.");
  }
  const provider = new RefreshingAuthProvider({ clientId, clientSecret });
  provider.onRefresh(async (_userId: string, newTokenData: AccessToken) => {
    fs.writeFileSync(tokenPaths.bot, JSON.stringify({ ...newTokenData, id: tokenData.id }, null, 2));
    console.log("Bot token refreshed");
  });
  await provider.addUser(
    tokenData.id,
    {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresIn: tokenData.expiresIn || null,
      obtainmentTimestamp: tokenData.obtainmentTimestamp || Date.now(),
      scope: tokenData.scope,
    },
    ["chat"] // only chat intent for bot
  );
  botAuthProvider = provider;
  return provider;
}

export function getTokenPaths() {
  return tokenPaths;
}

export function getUserId(type: "streamer" | "bot"): string {
  const tokenFilePath = tokenPaths[type];
  if (!fs.existsSync(tokenFilePath)) {
    throw new Error(`Token file for ${type} not found at ${tokenFilePath}`);
  }
  const tokenData = JSON.parse(fs.readFileSync(tokenFilePath, "utf-8"));
  if (!tokenData.id) {
    throw new Error(`User id not found in ${type} token file`);
  }
  return tokenData.id;
}
