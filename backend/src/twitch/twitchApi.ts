import { ApiClient } from "@twurple/api";
import { AppTokenAuthProvider } from "@twurple/auth";
import dotenv from "dotenv";
dotenv.config();

const clientId = process.env.TWITCH_CLIENT_ID!;
const clientSecret = process.env.TWITCH_CLIENT_SECRET!;

if (!clientId || !clientSecret) {
  throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env");
}

export function getTwitchApiClient(): ApiClient {
  // AppTokenAuthProvider takes (clientId, clientSecret, impliedScopes?)
  const authProvider = new AppTokenAuthProvider(clientId, clientSecret);
  return new ApiClient({ authProvider });
}

// Fetch user info by username (login)
export async function getUserInfoByUsername(username: string) {
  const api = getTwitchApiClient();
  return await api.users.getUserByName(username);
}

// Fetch user info by user ID
export async function getUserInfoById(userId: string) {
  const api = getTwitchApiClient();
  return await api.users.getUserById(userId);
}
