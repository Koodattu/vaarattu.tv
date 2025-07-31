import { ApiClient, HelixChatChatter, HelixCustomReward } from "@twurple/api";
import { getStreamerAuthProvider } from "../auth/authProviders";
import dotenv from "dotenv";
dotenv.config();

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

// Fetch the channel point rewards for a broadcaster
export async function getChannelPointRewards(broadcasterId: string): Promise<HelixCustomReward[]> {
  const api = await getTwitchApiClientWithStreamer();
  const rewardsResult = await api.channelPoints.getCustomRewards(broadcasterId);
  return rewardsResult;
}

// Fetch global badges
export async function getGlobalBadges() {
  const api = await getTwitchApiClientWithStreamer();
  return await api.chat.getGlobalBadges();
}

// Fetch channel-specific badges
export async function getChannelBadges(broadcasterId: string) {
  const api = await getTwitchApiClientWithStreamer();
  return await api.chat.getChannelBadges(broadcasterId);
}

// Check if user is VIP
export async function isUserVip(broadcasterId: string, userId: string): Promise<boolean> {
  const api = await getTwitchApiClientWithStreamer();
  try {
    const vips = await api.channels.getVips(broadcasterId);
    return vips.data.some((vip) => vip.id === userId);
  } catch (error) {
    console.error("Error checking VIP status:", error);
    return false;
  }
}

// Check if user is moderator
export async function isUserModerator(broadcasterId: string, userId: string): Promise<boolean> {
  const api = await getTwitchApiClientWithStreamer();
  try {
    const moderators = await api.moderation.getModerators(broadcasterId);
    return moderators.data.some((mod) => mod.userId === userId);
  } catch (error) {
    console.error("Error checking moderator status:", error);
    return false;
  }
}
