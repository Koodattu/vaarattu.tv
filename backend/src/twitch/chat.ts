import { ChatClient } from "@twurple/chat";
import { getBotAuthProvider } from "./authProviders";

export async function tryCreateChatClient() {
  const authProvider = await getBotAuthProvider();
  const chatClient = new ChatClient({
    authProvider,
    channels: [process.env.TWITCH_CHANNEL || "vaarattu"],
  });
  return chatClient;
}
