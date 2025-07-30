import type { EventSubStreamOfflineEvent } from "@twurple/eventsub-base";
import { syncChannelPointRewards } from "./channelReward.service";
import type { EventSubStreamOnlineEvent } from "@twurple/eventsub-base";
import { findOrCreateGame } from "../db/game.db";
import { createStreamWithGame, endLatestStreamForBroadcaster } from "../db/stream.db";

export async function processStreamOnlineEvent(event: EventSubStreamOnlineEvent, streamerChannel: string) {
  const result = await syncChannelPointRewards(streamerChannel);
  console.log(`[EventSub] Synced channel point rewards on stream start:`, result);

  const stream = await event.getStream();
  if (!stream) {
    console.warn(`[EventSub] No stream info found for streamer on stream start.`);
    return;
  }
  const game = await stream.getGame();
  // Ensure game exists
  const dbGame = await findOrCreateGame({
    id: stream.gameId,
    name: stream.gameName,
    boxArtUrl: game?.boxArtUrl,
  });
  // Create stream entry and associate game
  const dbStream = await createStreamWithGame({
    title: stream.title,
    startTime: stream.startDate,
    thumbnailUrl: stream.thumbnailUrl,
    gameId: dbGame.id,
  });
  console.log(`[EventSub] Stream/game tracked in DB.`);
  return dbStream;
}

export async function processStreamOfflineEvent(event: EventSubStreamOfflineEvent) {
  const userId = event.broadcasterId;
  const endTime = new Date(); // Use system time as Twitch does not provide end time
  const updated = await endLatestStreamForBroadcaster({ userId, endTime });
  if (updated) {
    console.log(`[EventSub] Stream ended and updated in DB.`, { streamId: updated.id, endTime });
  } else {
    console.warn(`[EventSub] No open stream found to end for broadcaster ${userId}`);
  }
}
