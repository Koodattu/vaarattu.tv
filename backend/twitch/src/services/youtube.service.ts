import prisma from "../prismaClient";
import { Prisma } from "@vaarattu/shared";
import { rankMatches } from "./youtubeMatching";

interface YoutubePage<T> { items: T[]; nextPageToken?: string }
interface Channel { id: string; contentDetails: { relatedPlaylists: { uploads: string } } }
interface PlaylistItem { contentDetails: { videoId: string } }
interface Video {
  id: string;
  snippet: { title: string; channelId: string; liveBroadcastContent: string };
  contentDetails: { duration: string };
  status: { embeddable: boolean; privacyStatus: string; uploadStatus: string };
}

const defaultChannelId = "UCUCV40VqBZqt83afjbbICvw";

async function youtubeRequest<T>(resource: string, params: Record<string, string>): Promise<YoutubePage<T>> {
  const key = process.env.YT_API_KEY?.trim();
  if (!key) throw new Error("Set YT_API_KEY in backend/.env before syncing YouTube.");
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("key", key);
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  } catch {
    // Fetch errors can contain the URL and its credential.
    throw new Error("YouTube request failed or timed out. The previous catalog is unchanged.");
  }
  if (!response.ok) throw new Error(`YouTube request failed (HTTP ${response.status}). Check API access and quota.`);
  const data = await response.json() as YoutubePage<T>;
  if (!Array.isArray(data.items)) throw new Error("YouTube returned an incomplete response.");
  return data;
}

export function durationSeconds(value: string): number {
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match || !match.slice(1).some((part) => part !== undefined)) throw new Error("YouTube returned an invalid video duration.");
  return Number(match[1] ?? 0) * 86400 + Number(match[2] ?? 0) * 3600 + Number(match[3] ?? 0) * 60 + Number(match[4] ?? 0);
}

async function fetchYoutubeChannel() {
  const channel = process.env.YT_CHANNEL?.trim() || defaultChannelId;
  const channels = await youtubeRequest<Channel>("channels", {
    part: "contentDetails", ...(channel.startsWith("UC") ? { id: channel } : { forHandle: channel }),
  });
  if (channels.items.length !== 1) throw new Error("YouTube channel could not be resolved uniquely. Set YT_CHANNEL to its channel ID or handle.");
  return channels.items[0];
}

async function configuredChannelId() {
  const channel = process.env.YT_CHANNEL?.trim() || defaultChannelId;
  return channel.startsWith("UC") ? channel : (await fetchYoutubeChannel()).id;
}

export async function fetchYoutubeCatalog() {
  const channel = await fetchYoutubeChannel();
  const channelId = channel.id;
  const playlistId = channel.contentDetails.relatedPlaylists.uploads;
  const ids = new Set<string>();
  let pageToken = "";
  const visited = new Set<string>();
  do {
    if (visited.has(pageToken)) throw new Error("YouTube returned repeated pagination. The previous catalog is unchanged.");
    visited.add(pageToken);
    const page = await youtubeRequest<PlaylistItem>("playlistItems", { part: "contentDetails", playlistId, maxResults: "50", ...(pageToken ? { pageToken } : {}) });
    for (const item of page.items) ids.add(item.contentDetails.videoId);
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  const videos = [];
  const allIds = [...ids];
  for (let offset = 0; offset < allIds.length; offset += 50) {
    const page = await youtubeRequest<Video>("videos", { part: "snippet,contentDetails,status", id: allIds.slice(offset, offset + 50).join(",") });
    for (const video of page.items) {
      if (video.snippet.channelId !== channelId) throw new Error("YouTube returned a video belonging to another channel.");
      videos.push({
        id: video.id, channelId, title: video.snippet.title,
        durationSeconds: durationSeconds(video.contentDetails.duration),
        available: video.status.embeddable && video.status.privacyStatus === "public" && video.status.uploadStatus === "processed" && video.snippet.liveBroadcastContent === "none",
      });
    }
  }
  return { channelId, videos };
}

async function lockMatches(tx: Prisma.TransactionClient) {
  const [row] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(86220401) AS locked`;
  if (!row.locked) throw new Error("Another recording update is running. Try again shortly.");
}

async function matchingData(db: Prisma.TransactionClient, channelId?: string) {
  const [streams, videos] = await Promise.all([
    db.stream.findMany({ select: { id: true, startTime: true, youtubeMatchLocked: true, segments: { select: { title: true } } }, orderBy: { startTime: "desc" } }),
    db.youTubeVideo.findMany({ where: channelId ? { channelId } : undefined, orderBy: { id: "asc" } }),
  ]);
  return { streams, videos, ...rankMatches(streams, videos.map((video) => video.matchSource === "automatic" ? { ...video, streamId: null } : video)) };
}

export async function syncYoutubeCatalog(autoMatch = true) {
  // Complete every API page before mutating inventory or availability.
  const catalog = await fetchYoutubeCatalog();
  return prisma.$transaction(async (tx) => {
    await lockMatches(tx);
    const checkedAt = new Date();
    for (const video of catalog.videos) {
      await tx.youTubeVideo.upsert({ where: { id: video.id }, create: { ...video, checkedAt }, update: { ...video, checkedAt } });
    }
    await tx.youTubeVideo.updateMany({
      where: { channelId: catalog.channelId, id: { notIn: catalog.videos.map((video) => video.id) } },
      data: { available: false, checkedAt },
    });
    const { automatic, videos } = await matchingData(tx, catalog.channelId);
    if (autoMatch) {
      // Automatic assignments remain provisional as titles and competing uploads change.
      await tx.youTubeVideo.updateMany({
        where: { channelId: catalog.channelId, matchSource: "automatic" },
        data: { streamId: null, position: null, streamOffsetSeconds: 0, matchSource: "unmatched", matchScore: null },
      });
      for (const match of automatic) {
        await tx.youTubeVideo.update({ where: { id: match.videoId }, data: {
          streamId: match.streamId, position: 1, streamOffsetSeconds: 0, matchSource: "automatic", matchScore: match.score,
        } });
      }
    }
    const changed = automatic.filter((match) => videos.find((video) => video.id === match.videoId)?.streamId !== match.streamId).length;
    return { videos: catalog.videos.length, matched: autoMatch ? changed : 0, proposed: automatic.length };
  }, { timeout: 120000 });
}

export async function recordingReport() {
  const { streams, videos, candidates, automatic } = await matchingData(prisma, await configuredChannelId());
  return streams.map((stream) => ({
    streamId: stream.id, startTime: stream.startTime, titles: stream.segments.map((segment) => segment.title), locked: stream.youtubeMatchLocked,
    recordings: videos.filter((video) => video.streamId === stream.id).sort((a, b) => a.position! - b.position!),
    candidates: candidates.filter((candidate) => candidate.streamId === stream.id).slice(0, 5).map((candidate) => ({
      ...candidate, title: videos.find((video) => video.id === candidate.videoId)!.title,
      assignedStreamId: videos.find((video) => video.id === candidate.videoId)!.streamId,
      automatic: automatic.includes(candidate),
    })),
  }));
}

export interface RecordingPart { videoId: string; streamOffsetSeconds: number }

export function validateParts(parts: RecordingPart[]) {
  if (!Array.isArray(parts) || parts.length > 100) throw new Error("Parts must be an array of at most 100 recordings.");
  const ids = new Set<string>();
  let previous = -1;
  for (const part of parts) {
    if (!part || typeof part.videoId !== "string" || !/^[\w-]{11}$/.test(part.videoId) || ids.has(part.videoId)) throw new Error("Each part must have a different valid YouTube video ID.");
    if (!Number.isSafeInteger(part.streamOffsetSeconds) || part.streamOffsetSeconds < 0 || part.streamOffsetSeconds > 2147483647 || part.streamOffsetSeconds <= previous) throw new Error("Part offsets must be increasing non-negative whole seconds from the original stream start.");
    previous = part.streamOffsetSeconds;
    ids.add(part.videoId);
  }
}

export async function setRecordingParts(streamId: number, parts: RecordingPart[]) {
  if (!Number.isSafeInteger(streamId) || streamId <= 0 || streamId > 2147483647) throw new Error("Invalid stream ID.");
  validateParts(parts);
  const channelId = parts.length ? await configuredChannelId() : null;
  await prisma.$transaction(async (tx) => {
    await lockMatches(tx);
    const stream = await tx.stream.findUnique({ where: { id: streamId }, select: { id: true, startTime: true, endTime: true } });
    if (!stream) throw new Error("Stream not found.");
    const videos = await tx.youTubeVideo.findMany({ where: { id: { in: parts.map((part) => part.videoId) } } });
    if (videos.length !== parts.length) throw new Error("A video is missing from the catalog. Sync the channel first.");
    if (videos.some((video) => video.channelId !== channelId || !video.available || video.durationSeconds <= 0)) throw new Error("Every part must be a playable video from the configured archive channel.");
    if (stream.endTime && parts.some((part) => part.streamOffsetSeconds >= (stream.endTime!.getTime() - stream.startTime.getTime()) / 1000)) throw new Error("A part starts after the stream ended. Check its offset.");
    if (videos.some((video) => video.streamId !== null && video.streamId !== streamId)) throw new Error("A video is assigned to another stream. Remove that assignment first.");
    for (let i = 0; i < parts.length - 1; i++) {
      const video = videos.find((item) => item.id === parts[i].videoId)!;
      if (parts[i].streamOffsetSeconds + video.durationSeconds > parts[i + 1].streamOffsetSeconds) throw new Error("Recording parts overlap on the stream timeline. Check the offsets.");
    }
    // Removed matches remain blocked so a later sync cannot silently restore them.
    await tx.youTubeVideo.updateMany({ where: { streamId }, data: { streamId: null, position: null, matchSource: "blocked", matchScore: null } });
    for (const [index, part] of parts.entries()) {
      await tx.youTubeVideo.update({ where: { id: part.videoId }, data: { streamId, position: index + 1, streamOffsetSeconds: part.streamOffsetSeconds, matchSource: "manual", matchScore: null } });
    }
    await tx.stream.update({ where: { id: streamId }, data: { youtubeMatchLocked: true } });
  });
}

let interval: NodeJS.Timeout | null = null;
let syncing = false;
export function startYoutubeSync() {
  if (interval || !process.env.YT_API_KEY?.trim()) return;
  const sync = async () => {
    if (syncing) return;
    syncing = true;
    try {
      const result = await syncYoutubeCatalog();
      console.log(`[YouTube] Synced ${result.videos} videos; matched ${result.matched} streams.`);
    } catch (error) {
      console.error("[YouTube] Sync failed:", error instanceof Error ? error.message : "Unknown error");
    } finally { syncing = false; }
  };
  void sync();
  interval = setInterval(sync, 6 * 60 * 60 * 1000);
  interval.unref();
}
