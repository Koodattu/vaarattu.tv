import prisma from "../prismaClient";
import { Prisma } from "@vaarattu/shared";
import { StreamListItem, StreamDetail, StreamTimeline } from "../types/api.types";
import { calculateOffset } from "../utils/pagination";
import { ActivityMinute, buildStreamActivity } from "../utils/streamActivity";
import { twitchRecordingAvailable } from "../utils/recordingPlayback";

export class StreamService {
  private async getUniqueViewerCounts(streamIds: number[]): Promise<Map<number, number>> {
    if (streamIds.length === 0) return new Map();
    const counts = await prisma.$queryRaw<Array<{ streamId: number; viewers: number }>>`
      SELECT "streamId", COUNT(DISTINCT "userId")::int AS viewers
      FROM "ViewSession" WHERE "streamId" IN (${Prisma.join(streamIds)})
      GROUP BY "streamId"
    `;
    return new Map(counts.map(row => [row.streamId, row.viewers]));
  }

  async getStreamActivity(streamId: number) {
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      select: {
        startTime: true,
        endTime: true,
        viewerSamples: { select: { timestamp: true, viewerCount: true }, orderBy: { timestamp: "asc" } },
      },
    });
    if (!stream) return null;

    const endTime = stream.endTime ?? new Date();
    const [sessions, minutes] = await Promise.all([
      stream.viewerSamples.length > 0 ? Promise.resolve([]) : prisma.viewSession.findMany({
        where: { streamId },
        select: { userId: true, sessionStart: true, sessionEnd: true },
      }),
      // These columns store UTC without a timezone. Bind UTC text so Prisma's
      // timestamptz Date parameters cannot introduce the database session's offset.
      prisma.$queryRaw<ActivityMinute[]>`
        SELECT FLOOR(EXTRACT(EPOCH FROM ("timestamp" - ${stream.startTime.toISOString()}::timestamp)) / 60)::int AS minute,
               COUNT(*)::int AS messages, COUNT(DISTINCT "userId")::int AS chatters
        FROM "Message"
        WHERE "streamId" = ${streamId}
          AND "timestamp" >= ${stream.startTime.toISOString()}::timestamp
          AND "timestamp" < ${endTime.toISOString()}::timestamp
        GROUP BY 1
        ORDER BY 1
      `,
    ]);
    return buildStreamActivity(stream.startTime, endTime, sessions, minutes, stream.viewerSamples);
  }

  async getStreams(page: number, limit: number): Promise<{ streams: StreamListItem[]; total: number }> {
    const offset = calculateOffset(page, limit);

    const [streams, total] = await Promise.all([
      prisma.stream.findMany({
        select: {
          id: true,
          twitchId: true,
          startTime: true,
          endTime: true,
          thumbnailUrl: true,
          youtubeVideos: {
            where: { available: true, thumbnailUrl: { not: null } },
            select: { thumbnailUrl: true },
            orderBy: { position: "asc" },
            take: 1,
          },
          _count: {
            select: {
              messages: true,
              redemptions: true,
            },
          },
          segments: {
            select: {
              startTime: true,
              endTime: true,
              title: true,
              game: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: { startTime: "asc" },
          },
        },
        orderBy: { startTime: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.stream.count(),
    ]);

    const viewerCounts = await this.getUniqueViewerCounts(streams.map(stream => stream.id));
    const formattedStreams: StreamListItem[] = streams.map((stream) => {
      const duration = stream.endTime ? Math.round((stream.endTime.getTime() - stream.startTime.getTime()) / (1000 * 60)) : null;

      return {
        id: stream.id,
        twitchId: stream.twitchId,
        startTime: stream.startTime,
        endTime: stream.endTime,
        duration,
        thumbnailUrl: stream.youtubeVideos[0]?.thumbnailUrl || stream.thumbnailUrl,
        totalMessages: stream._count.messages,
        totalRedemptions: stream._count.redemptions,
        uniqueViewers: viewerCounts.get(stream.id) ?? 0,
        segments: stream.segments.map((segment) => {
          const segmentDuration = segment.endTime ? Math.round((segment.endTime.getTime() - segment.startTime.getTime()) / (1000 * 60)) : null;

          return {
            title: segment.title,
            gameName: segment.game.name,
            startTime: segment.startTime,
            endTime: segment.endTime,
            duration: segmentDuration,
          };
        }),
      };
    });

    return { streams: formattedStreams, total };
  }

  async getStream(streamId: number): Promise<StreamDetail | null> {
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        twitchId: true,
        twitchVideoId: true,
        twitchVideoAvailable: true,
        twitchVideoCheckedAt: true,
        youtubeVideos: {
          where: { available: true },
          select: { id: true, title: true, position: true, streamOffsetSeconds: true, durationSeconds: true },
          orderBy: { position: "asc" },
        },
        startTime: true,
        endTime: true,
        thumbnailUrl: true,
        _count: {
          select: {
            messages: true,
            redemptions: true,
          },
        },
        segments: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            title: true,
            game: {
              select: {
                name: true,
                boxArtUrl: true,
              },
            },
          },
          orderBy: { startTime: "asc" },
        },
      },
    });

    if (!stream) {
      return null;
    }

    const duration = stream.endTime ? Math.round((stream.endTime.getTime() - stream.startTime.getTime()) / (1000 * 60)) : null;

    return {
      id: stream.id,
      twitchId: stream.twitchId,
      twitchVideoId: stream.twitchVideoId,
      twitchVideoAvailable: twitchRecordingAvailable(stream),
      youtubeVideos: stream.youtubeVideos.map((video) => ({ ...video, position: video.position! })),
      startTime: stream.startTime,
      endTime: stream.endTime,
      duration,
      thumbnailUrl: stream.thumbnailUrl,
      totalMessages: stream._count.messages,
      totalRedemptions: stream._count.redemptions,
      uniqueViewers: (await this.getUniqueViewerCounts([stream.id])).get(stream.id) ?? 0,
      segments: stream.segments.map((segment) => {
        const segmentDuration = segment.endTime ? Math.round((segment.endTime.getTime() - segment.startTime.getTime()) / (1000 * 60)) : null;

        return {
          id: segment.id,
          title: segment.title,
          gameName: segment.game.name,
          gameBoxArtUrl: segment.game.boxArtUrl,
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segmentDuration,
        };
      }),
    };
  }

  async getStreamTimeline(streamId: number): Promise<StreamTimeline | null> {
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        twitchId: true,
        startTime: true,
        endTime: true,
        _count: {
          select: {
            messages: true,
            redemptions: true,
          },
        },
        segments: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            game: {
              select: {
                name: true,
                boxArtUrl: true,
              },
            },
          },
          orderBy: { startTime: "asc" },
        },
        viewSessions: {
          select: {
            sessionStart: true,
            sessionEnd: true,
            user: {
              select: {
                id: true,
                login: true,
                displayName: true,
              },
            },
          },
          orderBy: { sessionStart: "asc" },
        },
      },
    });

    if (!stream) {
      return null;
    }

    const duration = stream.endTime ? Math.round((stream.endTime.getTime() - stream.startTime.getTime()) / (1000 * 60)) : null;

    const audience = buildStreamActivity(stream.startTime, stream.endTime ?? new Date(),
      stream.viewSessions.map(session => ({ ...session, userId: session.user.id })), []);
    const peakViewers = Math.max(0, ...audience.points.map(point => point.viewers ?? 0));

    return {
      id: stream.id,
      twitchId: stream.twitchId,
      startTime: stream.startTime,
      endTime: stream.endTime,
      duration,
      segments: stream.segments.map((segment) => {
        const segmentDuration = segment.endTime ? Math.round((segment.endTime.getTime() - segment.startTime.getTime()) / (1000 * 60)) : null;

        return {
          id: segment.id,
          title: segment.title,
          gameName: segment.game.name,
          gameBoxArtUrl: segment.game.boxArtUrl,
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segmentDuration,
        };
      }),
      viewerSessions: stream.viewSessions.map((session) => {
        const sessionDuration = session.sessionEnd ? Math.round((session.sessionEnd.getTime() - session.sessionStart.getTime()) / (1000 * 60)) : null;

        return {
          userId: session.user.id,
          userLogin: session.user.login,
          userDisplayName: session.user.displayName,
          sessionStart: session.sessionStart,
          sessionEnd: session.sessionEnd,
          duration: sessionDuration,
        };
      }),
      stats: {
        totalMessages: stream._count.messages,
        totalRedemptions: stream._count.redemptions,
        uniqueViewers: new Set(stream.viewSessions.map(session => session.user.id)).size,
        peakViewers,
      },
    };
  }

}
