import { ApiClient, HelixChatChatter } from "@twurple/api";
import dotenv from "dotenv";
dotenv.config();
import { getStreamerAuthProvider } from "./authProviders";

const clientId = process.env.TWITCH_CLIENT_ID!;
const clientSecret = process.env.TWITCH_CLIENT_SECRET!;

if (!clientId || !clientSecret) {
  throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env");
}

// Returns an ApiClient using the streamer user token
export async function getTwitchApiClientWithStreamer(): Promise<ApiClient> {
  const authProvider = await getStreamerAuthProvider();
  return new ApiClient({ authProvider });
}

// Fetch user info by username (login)
export async function getUserInfoByUsername(username: string) {
  const api = await getTwitchApiClientWithStreamer();
  return await api.users.getUserByName(username);
}

// Fetch user info by user ID
export async function getUserInfoById(userId: string) {
  const api = await getTwitchApiClientWithStreamer();
  return await api.users.getUserById(userId);
}

// Fetch the list of chatters in a channel
export async function getChannelChatters(broadcasterId: string): Promise<HelixChatChatter[]> {
  const api = await getTwitchApiClientWithStreamer();
  const chattersResult = await api.chat.getChatters(broadcasterId);
  return chattersResult.data;
}
