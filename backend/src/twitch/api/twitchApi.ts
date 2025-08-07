import { ApiClient, HelixChannelFollower, HelixChatChatter, HelixCustomReward, HelixSubscription, HelixUser } from "@twurple/api";
import { getStreamerAuthProvider } from "../auth/authProviders";

// Returns an ApiClient using the streamer user token
export async function getTwitchApiClientWithStreamer(): Promise<ApiClient> {
  const authProvider = await getStreamerAuthProvider();
  return new ApiClient({ authProvider });
}

// Fetch user info by username (login)
export async function getUserInfoByUsername(username: string): Promise<HelixUser | null> {
  const api = await getTwitchApiClientWithStreamer();
  return await api.users.getUserByName(username);
}

// Fetch user info by user ID
export async function getUserInfoById(userId: string): Promise<HelixUser | null> {
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
  return await api.channels.checkVipForUser(broadcasterId, userId);
}

// Check if user is moderator
export async function isUserModerator(broadcasterId: string, userId: string): Promise<boolean> {
  const api = await getTwitchApiClientWithStreamer();
  return await api.moderation.checkUserMod(broadcasterId, userId);
}

// Check if user is follower
export async function isUserFollower(broadcasterId: string, userId: string): Promise<HelixChannelFollower | null | undefined> {
  const api = await getTwitchApiClientWithStreamer();
  const broadcaster = await api.users.getUserById(broadcasterId);
  return await broadcaster?.getChannelFollower(userId);
}

// Check if user is subscriber
export async function isUserSubscriber(broadcasterId: string, userId: string): Promise<HelixSubscription | null | undefined> {
  const api = await getTwitchApiClientWithStreamer();
  const broadcaster = await api.users.getUserById(broadcasterId);
  return await broadcaster?.getSubscriber(userId);
}
