import { ApiClient } from "@twurple/api";
import { AppTokenAuthProvider } from "@twurple/auth";
import dotenv from "dotenv";

dotenv.config();

const clientId = process.env.TWITCH_CLIENT_ID!;
const clientSecret = process.env.TWITCH_CLIENT_SECRET!;

if (!clientId || !clientSecret) {
  throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env");
}

/**
 * Returns an ApiClient authenticated with an app access token.
 * Handles token generation and refresh automatically.
 */
export function getTwitchApiClient(): ApiClient {
  // AppTokenAuthProvider takes (clientId, clientSecret, impliedScopes?)
  const authProvider = new AppTokenAuthProvider(clientId, clientSecret);
  return new ApiClient({ authProvider });
}
