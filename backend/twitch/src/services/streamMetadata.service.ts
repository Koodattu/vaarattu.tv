import type { HelixStream } from "@twurple/api";
import prisma from "../prismaClient";
import { getTwitchApiClientWithStreamer } from "../twitch/api/twitchApi";

export async function syncStreamVideoIds(broadcasterId: string): Promise<void> {
  const api = await getTwitchApiClientWithStreamer();
  const videos = await api.videos.getVideosByUserPaginated(broadcasterId, { type: "archive", orderBy: "time" }).getAll();
  const videoIds = new Map<string, { id: string; thumbnailUrl: string }>();
  for (const video of videos) {
    if (video.streamId && !videoIds.has(video.streamId)) videoIds.set(video.streamId, { id: video.id, thumbnailUrl: video.getThumbnailUrl(640, 360) });
  }

  const streams = videoIds.size ? await prisma.stream.findMany({
    where: { twitchId: { in: [...videoIds.keys()] } },
    select: { id: true, twitchId: true, twitchVideoId: true, thumbnailUrl: true },
  }) : [];
  for (const stream of streams) {
    const video = videoIds.get(stream.twitchId)!;
    const thumbnailUrl = video.thumbnailUrl || stream.thumbnailUrl;
    if (stream.twitchVideoId !== video.id || stream.thumbnailUrl !== thumbnailUrl) {
      await prisma.stream.update({ where: { id: stream.id }, data: { twitchVideoId: video.id, thumbnailUrl } });
    }
  }
  const checkedAt = new Date();
  const publishedIds = videos.map((video) => video.id);
  await prisma.stream.updateMany({
    where: { twitchVideoId: { in: publishedIds } },
    data: { twitchVideoAvailable: true, twitchVideoCheckedAt: checkedAt },
  });
  await prisma.stream.updateMany({
    where: { twitchVideoId: { not: null, notIn: publishedIds } },
    data: { twitchVideoAvailable: false, twitchVideoCheckedAt: checkedAt },
  });
}

export async function recordStreamViewerSample(stream: Pick<HelixStream, "id" | "viewers">, timestamp: Date): Promise<void> {
  const stored = await prisma.stream.findUnique({
    where: { twitchId: stream.id },
    select: { id: true, startTime: true, endTime: true },
  });
  if (!stored || timestamp < stored.startTime || (stored.endTime && timestamp >= stored.endTime)) return;

  await prisma.streamViewerSample.createMany({
    data: [{ streamId: stored.id, timestamp, viewerCount: stream.viewers }],
    skipDuplicates: true,
  });
}
