import type { HelixClip } from "@twurple/api";
import { Prisma } from "@vaarattu/shared";
import prisma from "../prismaClient";
import { getTwitchApiClientWithStreamer } from "../twitch/api/twitchApi";
import { getUserId } from "../twitch/auth/authProviders";

const clipId = /^[A-Za-z0-9_-]{1,200}$/;

function validateClip(clip: HelixClip, broadcasterId: string) {
  if (typeof clip.id !== "string" || !clipId.test(clip.id) || clip.broadcasterId !== broadcasterId || typeof clip.title !== "string" ||
      typeof clip.creatorDisplayName !== "string" || !(clip.creationDate instanceof Date) || !Number.isFinite(clip.creationDate.getTime()) ||
      typeof clip.gameId !== "string" || typeof clip.videoId !== "string" || typeof clip.isFeatured !== "boolean" ||
      !Number.isSafeInteger(clip.views) || clip.views < 0 || clip.views > 2147483647 ||
      !Number.isFinite(clip.duration) || clip.duration <= 0 ||
      (clip.vodOffset !== null && (!Number.isSafeInteger(clip.vodOffset) || clip.vodOffset < 0 || clip.vodOffset > 2147483647))) {
    throw new Error("Twitch returned invalid clip metadata; the saved catalog was retained.");
  }
}

/** Refresh a complete catalog before changing availability. Twitch caps each date window. */
export async function syncClips() {
  const broadcasterId = getUserId("streamer");
  const api = await getTwitchApiClientWithStreamer();
  const clips = new Map<string, HelixClip>();
  let requests = 0;
  const started = Date.now();
  async function request<T>(operation: () => Promise<T>): Promise<T> {
    if (++requests > 500 || Date.now() - started > 5 * 60000) throw new Error("Clip sync exceeded its request budget; the saved catalog was retained.");
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([operation(), new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Twitch clip request timed out; the saved catalog was retained.")), 20000);
      })]);
    } finally { clearTimeout(timeout); }
  }
  async function window(start: number, end: number): Promise<void> {
    let after: string | undefined;
    const cursors = new Set<string>();
    const collected: HelixClip[] = [];
    do {
      const page = await request(() => api.clips.getClipsForBroadcaster(broadcasterId, {
        startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString(), limit: 100, after,
      }));
      if (!Array.isArray(page.data) || (page.cursor !== undefined && typeof page.cursor !== "string")) throw new Error("Invalid Twitch clips page.");
      for (const clip of page.data) { validateClip(clip, broadcasterId); collected.push(clip); }
      // Split before reaching the approximate 1000-result ceiling, even when the cursor disappears.
      if (collected.length >= 900) {
        if (end - start <= 1000) throw new Error("Too many clips in one second to verify a complete catalog.");
        const middle = Math.floor((start + end) / 2);
        await window(start, middle);
        await window(middle, end);
        return;
      }
      after = page.cursor;
      if (after && cursors.has(after)) throw new Error("Twitch repeated a clips cursor; the saved catalog was retained.");
      if (after) cursors.add(after);
    } while (after);
    for (const clip of collected) clips.set(clip.id, clip);
  }
  await window(0, started);

  // Rankings may move while pages are read. Confirm absence by ID, never by a missing list row.
  const existing = await prisma.clip.findMany({ where: { broadcasterId }, select: { id: true } });
  const missing = existing.map(clip => clip.id).filter(id => !clips.has(id));
  const unavailable: string[] = [];
  for (let i = 0; i < missing.length; i += 100) {
    const ids = missing.slice(i, i + 100);
    const found = await request(() => api.clips.getClipsByIds(ids));
    for (const clip of found) { validateClip(clip, broadcasterId); clips.set(clip.id, clip); }
    unavailable.push(...ids.filter(id => !clips.has(id)));
  }
  const gameIds = [...new Set([...clips.values()].map(clip => clip.gameId).filter(Boolean))];
  const games = new Map<string, string>();
  for (let i = 0; i < gameIds.length; i += 100) {
    for (const game of await request(() => api.games.getGamesByIds(gameIds.slice(i, i + 100)))) {
      if (typeof game.id !== "string" || typeof game.name !== "string") throw new Error("Invalid Twitch game metadata.");
      games.set(game.id, game.name);
    }
  }
  const checkedAt = new Date();
  // All remote work succeeded. Publish one atomic snapshot in bounded SQL batches.
  const rows = [...clips.values()].map(clip => {
    let thumbnailUrl: string | null = null;
    try { const url = new URL(clip.thumbnailUrl); if (url.protocol === "https:") thumbnailUrl = url.href; } catch { /* Missing preview is allowed. */ }
    // Prisma Date parameters are timestamptz; these schema columns store naive UTC.
    return Prisma.sql`(${clip.id}, ${broadcasterId}, ${clip.title}, ${clip.creatorDisplayName},
      ${clip.gameId || null}, ${games.get(clip.gameId) ?? null}, ${thumbnailUrl}, (${clip.creationDate}::timestamptz AT TIME ZONE 'UTC'),
      ${clip.duration}, ${clip.views}, ${clip.isFeatured}, ${clip.videoId || null}, ${clip.vodOffset}, true, (${checkedAt}::timestamptz AT TIME ZONE 'UTC'))`;
  });
  const writes: Prisma.PrismaPromise<unknown>[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    writes.push(prisma.$executeRaw`INSERT INTO "Clip"
      ("id", "broadcasterId", "title", "creatorName", "gameId", "gameName", "thumbnailUrl", "createdAt",
       "durationSeconds", "viewCount", "isFeatured", "videoId", "vodOffsetSeconds", "available", "checkedAt")
      VALUES ${Prisma.join(rows.slice(i, i + 100))}
      ON CONFLICT ("id") DO UPDATE SET
        "title" = EXCLUDED."title", "creatorName" = EXCLUDED."creatorName", "gameId" = EXCLUDED."gameId",
        "gameName" = EXCLUDED."gameName", "thumbnailUrl" = EXCLUDED."thumbnailUrl", "createdAt" = EXCLUDED."createdAt",
        "durationSeconds" = EXCLUDED."durationSeconds", "viewCount" = EXCLUDED."viewCount", "isFeatured" = EXCLUDED."isFeatured",
        "videoId" = EXCLUDED."videoId", "vodOffsetSeconds" = EXCLUDED."vodOffsetSeconds", "available" = true, "checkedAt" = EXCLUDED."checkedAt"`);
  }
  if (unavailable.length) writes.push(prisma.clip.updateMany({ where: { broadcasterId, id: { in: unavailable } }, data: { available: false, checkedAt } }));
  await prisma.$transaction(writes);
  return { clips: clips.size, unavailable: unavailable.length };
}

let interval: NodeJS.Timeout | undefined;
let syncing = false;
/** Optional collection: a stalled or failed import never holds up stream/chat startup. */
export function startClipSync() {
  if (interval) return;
  const refresh = async () => {
    if (syncing) return;
    syncing = true;
    try {
      const result = await syncClips();
      console.log(`[Clips] Synced ${result.clips} clips; ${result.unavailable} unavailable.`);
    } catch {
      // SDK errors can contain request details. Keep credentials out of background logs.
      console.error("[Clips] Sync failed; saved clips retained. The next scheduled refresh will retry.");
    } finally { syncing = false; }
  };
  void refresh();
  interval = setInterval(refresh, 15 * 60000);
  interval.unref();
}
