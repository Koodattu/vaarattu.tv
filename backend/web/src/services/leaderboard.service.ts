import prisma from "../prismaClient";
import { LeaderboardEmote, LeaderboardUser, LeaderboardReward, LeaderboardGame } from "../types/api.types";
import { calculateOffset } from "../utils/pagination";

export class LeaderboardService {
  async getTopEmotes(page: number, limit: number): Promise<{ emotes: LeaderboardEmote[]; total: number }> {
    const offset = calculateOffset(page, limit);

    const [emotes, total] = await Promise.all([
      prisma.emote.findMany({
        select: {
          id: true,
          name: true,
          platform: true,
          imageUrl: true,
          _count: {
            select: {
              emoteUsages: true,
            },
          },
        },
        orderBy: {
          emoteUsages: {
            _count: "desc",
          },
        },
        skip: offset,
        take: limit,
      }),
      prisma.emote.count(),
    ]);

    const formattedEmotes: LeaderboardEmote[] = emotes.map((emote) => ({
      id: emote.id,
      name: emote.name,
      platform: emote.platform,
      imageUrl: emote.imageUrl,
      totalUsage: emote._count.emoteUsages,
    }));

    return { emotes: formattedEmotes, total };
  }

  async getTopUsers(page: number, limit: number, sortBy: "messages" | "watchtime" | "points" = "messages"): Promise<{ users: LeaderboardUser[]; total: number }> {
    const offset = calculateOffset(page, limit);

    let orderBy: any;
    switch (sortBy) {
      case "watchtime":
        orderBy = { viewerProfile: { totalWatchTime: "desc" } };
        break;
      case "points":
        orderBy = { viewerProfile: { totalPointsSpent: "desc" } };
        break;
      default:
        orderBy = { viewerProfile: { totalMessages: "desc" } };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          twitchId: true,
          login: true,
          displayName: true,
          avatar: true,
          viewerProfile: {
            select: {
              totalMessages: true,
              totalWatchTime: true,
              totalPointsSpent: true,
              totalRedemptions: true,
            },
          },
        },
        where: {
          viewerProfile: {
            isNot: null,
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.user.count({
        where: {
          viewerProfile: {
            isNot: null,
          },
        },
      }),
    ]);

    const formattedUsers: LeaderboardUser[] = users.map((user) => ({
      id: user.id,
      twitchId: user.twitchId,
      login: user.login,
      displayName: user.displayName,
      avatar: user.avatar,
      totalMessages: user.viewerProfile?.totalMessages || 0,
      totalWatchTime: user.viewerProfile?.totalWatchTime || 0,
      totalPointsSpent: user.viewerProfile?.totalPointsSpent || 0,
      totalRedemptions: user.viewerProfile?.totalRedemptions || 0,
    }));

    return { users: formattedUsers, total };
  }

  async getTopRewards(page: number, limit: number): Promise<{ rewards: LeaderboardReward[]; total: number }> {
    const offset = calculateOffset(page, limit);

    const [rewards, total] = await Promise.all([
      prisma.channelReward.findMany({
        select: {
          id: true,
          twitchId: true,
          title: true,
          cost: true,
          imageUrl: true,
          _count: {
            select: {
              redemptions: true,
            },
          },
          redemptions: {
            select: {
              channelReward: {
                select: {
                  cost: true,
                },
              },
            },
          },
        },
        orderBy: {
          redemptions: {
            _count: "desc",
          },
        },
        skip: offset,
        take: limit,
      }),
      prisma.channelReward.count(),
    ]);

    const formattedRewards: LeaderboardReward[] = rewards.map((reward) => ({
      id: reward.id,
      twitchId: reward.twitchId,
      title: reward.title,
      cost: reward.cost,
      imageUrl: reward.imageUrl,
      totalRedemptions: reward._count.redemptions,
      totalPointsSpent: reward._count.redemptions * reward.cost,
    }));

    return { rewards: formattedRewards, total };
  }

  async getTopGames(page: number, limit: number): Promise<{ games: LeaderboardGame[]; total: number }> {
    const offset = calculateOffset(page, limit);

    // This is a complex query - we need to aggregate watchtime per game across all stream segments
    const gamesWithStats = await prisma.game.findMany({
      select: {
        id: true,
        twitchId: true,
        name: true,
        boxArtUrl: true,
        segments: {
          select: {
            startTime: true,
            endTime: true,
            stream: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      skip: offset,
      take: limit,
    });

    const total = await prisma.game.count();

    const formattedGames: LeaderboardGame[] = gamesWithStats.map((game) => {
      const totalWatchTime = game.segments.reduce((acc, segment) => {
        if (segment.endTime) {
          const duration = (segment.endTime.getTime() - segment.startTime.getTime()) / (1000 * 60); // minutes
          return acc + duration;
        }
        return acc;
      }, 0);

      const uniqueStreams = new Set(game.segments.map((s) => s.stream.id)).size;

      return {
        id: game.id,
        twitchId: game.twitchId,
        name: game.name,
        boxArtUrl: game.boxArtUrl,
        totalWatchTime: Math.round(totalWatchTime),
        totalStreams: uniqueStreams,
      };
    });

    // Sort by total watch time (since we can't do this in SQL easily)
    formattedGames.sort((a, b) => b.totalWatchTime - a.totalWatchTime);

    return { games: formattedGames, total };
  }
}
