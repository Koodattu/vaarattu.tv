import { ChatClient } from "@twurple/chat";
import { getStreamerAuthProvider, getUserId } from "../auth/authProviders";
import { getUserInfoById } from "./twitchApi";

export async function tryCreateChatClient() {
  const authProvider = await getStreamerAuthProvider();
  const streamerName = await getUserInfoById(getUserId("streamer")).then((user) => {
    if (!user) {
      throw new Error("Streamer user not found");
    }
    return user.name;
  });
  const chatClient = new ChatClient({
    authProvider: authProvider,
    channels: [streamerName],
    requestMembershipEvents: true,
  });
  return chatClient;
}
