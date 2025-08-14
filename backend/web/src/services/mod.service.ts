import prisma from "../prismaClient";
import { UserMessage } from "../types/api.types";
import { calculateOffset } from "../utils/pagination";

export class ModService {
  async getUserMessages(userId: number, page: number, limit: number, search?: string, streamId?: number): Promise<{ messages: UserMessage[]; total: number }> {
    const offset = calculateOffset(page, limit);

    const whereClause: any = { userId };

    if (search) {
      whereClause.content = {
        contains: search,
        mode: "insensitive" as const,
      };
    }

    if (streamId) {
      whereClause.streamId = streamId;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        select: {
          id: true,
          twitchId: true,
          content: true,
          timestamp: true,
          streamId: true,
          stream: {
            select: {
              startTime: true,
            },
          },
        },
        where: whereClause,
        orderBy: { timestamp: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.message.count({ where: whereClause }),
    ]);

    const formattedMessages: UserMessage[] = messages.map((message) => ({
      id: message.id,
      twitchId: message.twitchId,
      content: message.content,
      timestamp: message.timestamp,
      streamId: message.streamId,
      streamStartTime: message.stream.startTime,
    }));

    return { messages: formattedMessages, total };
  }

  async searchMessages(search: string, page: number, limit: number, streamId?: number, userId?: number): Promise<{ messages: UserMessage[]; total: number }> {
    const offset = calculateOffset(page, limit);

    const whereClause: any = {
      content: {
        contains: search,
        mode: "insensitive" as const,
      },
    };

    if (streamId) {
      whereClause.streamId = streamId;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        select: {
          id: true,
          twitchId: true,
          content: true,
          timestamp: true,
          streamId: true,
          userId: true,
          user: {
            select: {
              login: true,
              displayName: true,
            },
          },
          stream: {
            select: {
              startTime: true,
            },
          },
        },
        where: whereClause,
        orderBy: { timestamp: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.message.count({ where: whereClause }),
    ]);

    const formattedMessages: UserMessage[] = messages.map((message) => ({
      id: message.id,
      twitchId: message.twitchId,
      content: message.content,
      timestamp: message.timestamp,
      streamId: message.streamId,
      streamStartTime: message.stream.startTime,
    }));

    return { messages: formattedMessages, total };
  }
}
