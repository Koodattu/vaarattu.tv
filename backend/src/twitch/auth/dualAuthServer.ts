import express from "express";
import { exchangeCode } from "@twurple/auth";
import fs from "fs";
import { getTokenPaths } from "./authProviders";

const clientId = process.env.TWITCH_CLIENT_ID!;
const clientSecret = process.env.TWITCH_CLIENT_SECRET!;

function getRedirectUri(account: "streamer" | "bot") {
  // Allow override by env, else use port 3001 for streamer and 3002 for bot
  if (process.env.TWITCH_REDIRECT_URI) return process.env.TWITCH_REDIRECT_URI;
  const port = account === "streamer" ? 3001 : 3002;
  return `http://localhost:${port}/twitch/callback`;
}

const scopes = {
  streamer: [
    "channel:read:subscriptions",
    "channel:read:redemptions",
    "bits:read",
    "channel:read:charity",
    "channel:read:goals",
    "channel:read:hype_train",
    "channel:read:polls",
    "channel:read:predictions",
    "moderator:read:followers",
    "moderator:read:chatters",
    "chat:read",
    "user:read:chat",
  ],
  bot: ["chat:read", "chat:edit"],
};

export function getOAuthUrl(account: "streamer" | "bot") {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(account),
    response_type: "code",
    scope: scopes[account].join(" "),
    force_verify: "true",
  });
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

export function startTwitchAuthServer(account: "streamer" | "bot") {
  const app = express();
  const port = account === "streamer" ? 3001 : 3002;
  const tokenDataPath = getTokenPaths()[account];

  app.get("/twitch/callback", async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send("Missing code");
    }
    try {
      const tokenData = await exchangeCode(clientId, clientSecret, code, getRedirectUri(account));
      // Fetch user id from token info endpoint
      const userInfo = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: { Authorization: `OAuth ${tokenData.accessToken}` },
      }).then((r) => r.json());
      if (!userInfo.user_id) {
        throw new Error("Could not fetch user id");
      }
      fs.writeFileSync(
        tokenDataPath,
        JSON.stringify({ ...tokenData, id: userInfo.user_id, scope: scopes[account] }, null, 2)
      );
      res.send(`Twitch ${account} tokens saved! You can now stop this server and restart the app.`);
      console.log(`Twitch ${account} tokens saved to`, tokenDataPath);
      setTimeout(() => process.exit(0), 2000);
    } catch (err) {
      console.error("Failed to exchange code:", err);
      res.status(500).send("Failed to exchange code");
    }
  });

  app.listen(port, () => {
    console.log(`Twitch auth server for ${account} running at http://localhost:${port}`);
    console.log(`Visit this URL to authorize your ${account} account:`);
    console.log(getOAuthUrl(account));
  });
}
