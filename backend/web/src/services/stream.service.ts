import prisma from "../prismaClient";
import { StreamListItem, StreamTimeline } from "../types/api.types";
import { calculateOffset } from "../utils/pagination";

export class StreamService {
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
          _count: {
            select: {
              messages: true,
              redemptions: true,
              viewSessions: true,
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

    const formattedStreams: StreamListItem[] = streams.map((stream) => {
      const duration = stream.endTime ? Math.round((stream.endTime.getTime() - stream.startTime.getTime()) / (1000 * 60)) : null;

      return {
        id: stream.id,
        twitchId: stream.twitchId,
        startTime: stream.startTime,
        endTime: stream.endTime,
        duration,
        thumbnailUrl: stream.thumbnailUrl,
        totalMessages: stream._count.messages,
        totalRedemptions: stream._count.redemptions,
        uniqueViewers: stream._count.viewSessions,
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
            viewSessions: true,
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

    // Calculate peak viewers (simplified - count overlapping sessions)
    const peakViewers = this.calculatePeakViewers(stream.viewSessions);

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
        uniqueViewers: stream._count.viewSessions,
        peakViewers,
      },
    };
  }

  private calculatePeakViewers(sessions: Array<{ sessionStart: Date; sessionEnd: Date | null }>): number {
    // Simple algorithm: find the maximum number of overlapping sessions
    // This is a simplified version - could be optimized for large datasets

    const events: Array<{ time: Date; type: "start" | "end" }> = [];

    sessions.forEach((session) => {
      events.push({ time: session.sessionStart, type: "start" });
      if (session.sessionEnd) {
        events.push({ time: session.sessionEnd, type: "end" });
      }
    });

    // Sort events by time
    events.sort((a, b) => a.time.getTime() - b.time.getTime());

    let currentViewers = 0;
    let peakViewers = 0;

    events.forEach((event) => {
      if (event.type === "start") {
        currentViewers++;
        peakViewers = Math.max(peakViewers, currentViewers);
      } else {
        currentViewers--;
      }
    });

    return peakViewers;
  }
}
