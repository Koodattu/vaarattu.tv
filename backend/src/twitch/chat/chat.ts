import { ChatClient } from "@twurple/chat";
import { getBotAuthProvider, getUserId } from "../auth/authProviders";
import { getUserInfoById } from "../api/twitchApi";

export async function tryCreateChatClient() {
  const authProvider = await getBotAuthProvider();
  const streamerName = await getUserInfoById(getUserId("streamer")).then((user) => {
    if (!user) {
      throw new Error("Streamer user not found");
    }
    return user.name;
  });
  const chatClient = new ChatClient({
    authProvider,
    channels: [streamerName],
  });
  return chatClient;
}
