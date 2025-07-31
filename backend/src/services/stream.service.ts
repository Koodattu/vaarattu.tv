import prisma from "../prismaClient";
import type { EventSubStreamOfflineEvent } from "@twurple/eventsub-base";
import type { EventSubStreamOnlineEvent } from "@twurple/eventsub-base";
import type { EventSubChannelUpdateEvent } from "@twurple/eventsub-base";
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
  // Create stream entry and initial segment
  const dbStream = await prisma.stream.create({
    data: {
      id: stream.id,
      startTime: stream.startDate,
      thumbnailUrl: stream.thumbnailUrl,
      segments: {
        create: {
          startTime: stream.startDate,
          title: stream.title,
          gameId: dbGame.id,
        },
      },
    },
    include: { segments: true },
  });
  console.log(`[EventSub] Stream and initial segment tracked in DB.`);
  return dbStream;
}

async function findOrCreateGame(game: { id: string; name: string; boxArtUrl?: string }) {
  let dbGame = await prisma.game.findUnique({ where: { id: game.id } });
  if (!dbGame) {
    console.log("Game not found, creating new entry:", game);
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
  // Find latest open stream with segments
  const latest = await prisma.stream.findFirst({
    where: { endTime: null },
    orderBy: { startTime: "desc" },
    include: { segments: { orderBy: { startTime: "desc" } } },
  });
  if (!latest) {
    console.warn("[EventSub] No open stream found to end.");
    return;
  }
  const lastSegment = latest.segments && latest.segments.length > 0 ? latest.segments[0] : null;
  if (lastSegment && !lastSegment.endTime) {
    await prisma.streamSegment.update({
      where: { id: lastSegment.id },
      data: { endTime },
    });
  }
  await prisma.stream.update({
    where: { id: latest.id },
    data: { endTime },
  });
  console.log(`[EventSub] Stream and last segment ended in DB.`, { streamId: latest.id, endTime });
}

// Called when the channel updates (game/category/title change)
export async function processChannelUpdateEvent(event: EventSubChannelUpdateEvent) {
  // Find the latest stream (not ended)
  const latest = await prisma.stream.findFirst({
    where: { endTime: null },
    orderBy: { startTime: "desc" },
    include: { segments: { orderBy: { startTime: "desc" } } },
  });
  if (!latest) {
    console.warn("[EventSub] No open stream found to update on channel update event.");
    return;
  }
  const game = await event.getGame();
  const dbGame = await findOrCreateGame({
    id: event.categoryId,
    name: event.categoryName,
    boxArtUrl: game?.boxArtUrl,
  });
  const lastSegment = latest.segments && latest.segments.length > 0 ? latest.segments[0] : null;
  if (!lastSegment) {
    await prisma.streamSegment.create({
      data: {
        streamId: latest.id,
        startTime: new Date(),
        title: event.streamTitle,
        gameId: dbGame.id,
      },
    });
    console.log(`[EventSub] No previous segment, created new segment on channel update.`);
    return;
  }
  if (lastSegment.gameId !== dbGame.id) {
    await prisma.streamSegment.update({
      where: { id: lastSegment.id },
      data: { endTime: new Date() },
    });
    await prisma.streamSegment.create({
      data: {
        streamId: latest.id,
        startTime: new Date(),
        title: event.streamTitle,
        gameId: dbGame.id,
      },
    });
    console.log(`[EventSub] Started new segment due to game change.`, {
      streamId: latest.id,
      gameId: dbGame.id,
      gameName: dbGame.name,
      title: event.streamTitle,
    });
  } else {
    console.log(`[EventSub] Channel update event: game did not change, no new segment created.`);
  }
}
