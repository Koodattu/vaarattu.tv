import prisma from "../prismaClient";
import type { EventSubStreamOfflineEvent } from "@twurple/eventsub-base";
import type { EventSubStreamOnlineEvent } from "@twurple/eventsub-base";
import { syncChannelPointRewards } from "./channelReward.service";

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
  const dbStream = await createStreamWithGame(stream.id, stream.title, stream.startDate, stream.thumbnailUrl, dbGame.id);
  console.log(`[EventSub] Stream/game tracked in DB.`);
  return dbStream;
}

async function createStreamWithGame(id: string, title: string, startTime: Date, thumbnailUrl?: string, gameId?: string) {
  return prisma.stream.create({
    data: {
      id,
      title,
      startTime,
      thumbnailUrl,
      games: { connect: { id: gameId } },
    },
  });
}

async function findOrCreateGame(game: { id: string; name: string; boxArtUrl?: string }) {
  let dbGame = await prisma.game.findUnique({ where: { id: game.id } });
  if (!dbGame) {
    dbGame = await prisma.game.create({
      data: {
        id: game.id,
        name: game.name,
        boxArtUrl: game.boxArtUrl,
      },
    });
  }
  return dbGame;
}

export async function processStreamOfflineEvent(event: EventSubStreamOfflineEvent) {
  const endTime = new Date();
  const updated = await endLatestStreamForBroadcaster(endTime);
  if (updated) {
    console.log(`[EventSub] Stream ended and updated in DB.`, { streamId: updated.id, endTime });
  } else {
    console.warn("[EventSub] No open stream found to end.");
  }
}

async function endLatestStreamForBroadcaster(endTime: Date) {
  const latest = await prisma.stream.findFirst({
    where: {
      games: {
        some: {
          streams: {
            some: {},
          },
        },
      },
      endTime: null,
    },
    orderBy: { startTime: "desc" },
  });
  if (!latest) return null;
  return prisma.stream.update({
    where: { id: latest.id },
    data: { endTime },
  });
}
