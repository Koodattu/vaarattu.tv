import prisma from "../prismaClient";
import { parseTitle, rankMatches } from "@vaarattu/shared";

export interface SearchQuery { q: string; youtubeId?: string; limit: number }

export function parseSearchQuery(query: Record<string, unknown>): SearchQuery | null {
  const { q = "", youtubeId, limit = "10" } = query;
  if (typeof q !== "string" || q.length > 300 || typeof limit !== "string" || !/^(?:[1-9]|10)$/.test(limit)) return null;
  if (youtubeId !== undefined && (typeof youtubeId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(youtubeId))) return null;
  if (!youtubeId && q.trim().length < 2) return null;
  return { q: q.trim(), youtubeId: youtubeId as string | undefined, limit: Number(limit) };
}

async function loadCatalog() {
  return prisma.stream.findMany({
    select: {
      id: true, startTime: true, endTime: true,
      segments: { select: { title: true }, orderBy: { startTime: "asc" } },
      youtubeVideos: { select: { id: true, title: true, available: true, streamOffsetSeconds: true, durationSeconds: true, matchSource: true } },
    },
    orderBy: { id: "asc" },
  });
}

// Searches share a short-lived metadata snapshot; no chat rows or counts are loaded.
export class StreamSearchService {
  private catalog: ReturnType<typeof loadCatalog> | null = null;
  private expires = 0;

  async search(query: SearchQuery) {
    if (!this.catalog || Date.now() >= this.expires) {
      this.expires = Infinity;
      this.catalog = loadCatalog().then((rows) => {
        this.expires = Date.now() + 60000;
        return rows;
      }, (error) => { this.catalog = null; this.expires = 0; throw error; });
    }
    const streams = await this.catalog;
    const exact = streams.find((stream) => stream.youtubeVideos.some((video) => video.id === query.youtubeId));
    const exactVideo = exact?.youtubeVideos.find((video) => video.id === query.youtubeId);
    const title = query.q || exactVideo?.title || "";
    const ranked = rankMatches(streams.map((stream) => ({
      ...stream, youtubeMatchLocked: false,
      segments: [...stream.segments, ...stream.youtubeVideos.map((video) => ({ title: video.title }))],
    })), [{ id: query.youtubeId || "search", title, available: true, streamId: null, matchSource: "unmatched" }]);
    const rows = ranked.candidates.map((candidate) => ({ ...candidate, exact: false }));
    if (exact) {
      const previous = rows.findIndex((row) => row.streamId === exact.id);
      if (previous >= 0) rows.splice(previous, 1);
      rows.unshift({ streamId: exact.id, videoId: query.youtubeId!, score: 1, part: parseTitle(title).part, hasDate: false, text: title, exact: true });
    }
    const suggested = exact?.id ?? ranked.automatic[0]?.streamId ?? null;
    return {
      query: title,
      suggestedStreamId: suggested,
      matches: rows.slice(0, query.limit).map((row) => {
        const stream = streams.find((item) => item.id === row.streamId)!;
        const video = row.exact ? exactVideo : undefined;
        return {
          id: stream.id, startTime: stream.startTime, endTime: stream.endTime,
          durationSeconds: stream.endTime ? (stream.endTime.getTime() - stream.startTime.getTime()) / 1000 : null,
          titles: [...new Set(stream.segments.map((segment) => segment.title))],
          similarity: row.score, identity: row.exact ? "linked" : "likely",
          reason: row.exact ? "Saved YouTube association" : row.hasDate ? "Recording date and similar title" : "Similar title",
          streamOffsetSeconds: video?.streamOffsetSeconds ?? null,
          recordingDurationSeconds: video?.durationSeconds ?? null,
          mappingSource: video?.matchSource ?? null,
          alignment: video ? "saved" : "unknown",
        };
      }),
    };
  }
}
