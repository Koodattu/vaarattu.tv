import prisma from "../prismaClient";
import { LeaderboardEmote, LeaderboardUser, LeaderboardReward, LeaderboardGame, RewardUserLeaderboard, LeaderboardSummary } from "../types/api.types";
import { calculateOffset } from "../utils/pagination";

export type TimeRange = "all" | "year" | "month" | "week";

function getDateFromRange(range: TimeRange): Date | null {
  if (range === "all") return null;

  const now = new Date();
  switch (range) {
    case "year":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "month":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export class LeaderboardService {
  // Get summary with top 3 of each category for main leaderboards page
  async getSummary(timeRange: TimeRange = "all"): Promise<LeaderboardSummary> {
    const [topWatchtime, topMessages, topPointsSpent, topEmotesResult, topRewardsResult] = await Promise.all([
      this.getTopUsers(1, 3, "watchtime", timeRange),
      this.getTopUsers(1, 3, "messages", timeRange),
      this.getTopUsers(1, 3, "points", timeRange),
      this.getTopEmotes(1, 3, timeRange),
      this.getTopRewards(1, 3, timeRange),
    ]);

    return {
      topWatchtime: topWatchtime.users,
      topMessages: topMessages.users,
      topPointsSpent: topPointsSpent.users,
      topEmotes: topEmotesResult.emotes,
      topRewards: topRewardsResult.rewards,
    };
  }

  async getTopEmotes(page: number, limit: number, timeRange: TimeRange = "all", platform?: string): Promise<{ emotes: LeaderboardEmote[]; total: number }> {
    const offset = calculateOffset(page, limit);

    // Note: EmoteUsage doesn't have timestamps in current schema, so time range won't affect emotes
    // For now, just filter by platform if specified

    const whereClause: any = {};
    if (platform) {
      whereClause.platform = platform;
    }

    // Get emote usage counts by aggregating the sum of counts from EmoteUsage
    const emoteUsageSums = await prisma.emoteUsage.groupBy({
      by: ["emoteId"],
      _sum: {
        count: true,
      },
      orderBy: {
        _sum: {
          count: "desc",
        },
      },
    });

    // Create a map of emoteId to total usage count
    const usageMap = new Map(emoteUsageSums.map((item) => [item.emoteId, item._sum.count || 0]));

    // Get emote IDs in the correct order
    const emoteIds = emoteUsageSums.map((item) => item.emoteId);

    // Apply pagination and platform filter
    const filteredEmoteIds = emoteIds.slice(offset, offset + limit);

    // Fetch emote details
    const emotes = await prisma.emote.findMany({
      where: {
        id: { in: filteredEmoteIds },
        ...whereClause,
      },
      select: {
        id: true,
        name: true,
        platform: true,
        imageUrl: true,
      },
    });

    // Sort emotes by usage count (maintain order from aggregation)
    const emoteMap = new Map(emotes.map((e) => [e.id, e]));
    const sortedEmotes = filteredEmoteIds.map((id) => emoteMap.get(id)).filter((e): e is NonNullable<typeof e> => e !== undefined);

    const formattedEmotes: LeaderboardEmote[] = sortedEmotes.map((emote) => ({
      id: emote.id,
      name: emote.name,
      platform: emote.platform,
      imageUrl: emote.imageUrl,
      totalUsage: usageMap.get(emote.id) || 0,
    }));

    // Get total count
    const total = await prisma.emote.count({ where: whereClause });

    return { emotes: formattedEmotes, total };
  }

  async getTopUsers(
    page: number,
    limit: number,
    sortBy: "messages" | "watchtime" | "points" = "messages",
    timeRange: TimeRange = "all"
  ): Promise<{ users: LeaderboardUser[]; total: number }> {
    const startDate = getDateFromRange(timeRange);

    // For "all" time range, use pre-calculated ViewerProfile data
    if (!startDate) {
      return this.getTopUsersFromProfile(page, limit, sortBy);
    }

    // For specific time ranges, calculate from source data
    return this.getTopUsersCalculated(page, limit, sortBy, startDate);
  }

  private async getTopUsersFromProfile(page: number, limit: number, sortBy: "messages" | "watchtime" | "points"): Promise<{ users: LeaderboardUser[]; total: number }> {
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

  private async getTopUsersCalculated(
    page: number,
    limit: number,
    sortBy: "messages" | "watchtime" | "points",
    startDate: Date
  ): Promise<{ users: LeaderboardUser[]; total: number }> {
    // Calculate stats from source tables for time-range filtering

    if (sortBy === "messages") {
      const messageCounts = await prisma.message.groupBy({
        by: ["userId"],
        where: {
          timestamp: { gte: startDate },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        skip: calculateOffset(page, limit),
        take: limit,
      });

      const total = await prisma.message.groupBy({
        by: ["userId"],
        where: { timestamp: { gte: startDate } },
      });

      const userIds = messageCounts.map((m) => m.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          twitchId: true,
          login: true,
          displayName: true,
          avatar: true,
        },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));

      return {
        users: messageCounts.map((m) => {
          const user = userMap.get(m.userId)!;
          return {
            id: user.id,
            twitchId: user.twitchId,
            login: user.login,
            displayName: user.displayName,
            avatar: user.avatar,
            totalMessages: m._count.id,
            totalWatchTime: 0,
            totalPointsSpent: 0,
            totalRedemptions: 0,
          };
        }),
        total: total.length,
      };
    }

    if (sortBy === "watchtime") {
      const sessions = await prisma.viewSession.findMany({
        where: {
          sessionStart: { gte: startDate },
          sessionEnd: { not: null },
        },
        select: {
          userId: true,
          sessionStart: true,
          sessionEnd: true,
        },
      });

      // Aggregate watchtime per user
      const watchtimeMap = new Map<number, number>();
      sessions.forEach((session) => {
        if (session.sessionEnd) {
          const duration = (session.sessionEnd.getTime() - session.sessionStart.getTime()) / (1000 * 60);
          watchtimeMap.set(session.userId, (watchtimeMap.get(session.userId) || 0) + duration);
        }
      });

      const sorted = Array.from(watchtimeMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(calculateOffset(page, limit), calculateOffset(page, limit) + limit);

      const userIds = sorted.map(([userId]) => userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          twitchId: true,
          login: true,
          displayName: true,
          avatar: true,
        },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));

      return {
        users: sorted.map(([userId, watchtime]) => {
          const user = userMap.get(userId)!;
          return {
            id: user.id,
            twitchId: user.twitchId,
            login: user.login,
            displayName: user.displayName,
            avatar: user.avatar,
            totalMessages: 0,
            totalWatchTime: Math.round(watchtime),
            totalPointsSpent: 0,
            totalRedemptions: 0,
          };
        }),
        total: watchtimeMap.size,
      };
    }

    // sortBy === "points"
    const redemptions = await prisma.redemption.findMany({
      where: {
        timestamp: { gte: startDate },
      },
      select: {
        userId: true,
        channelReward: {
          select: { cost: true },
        },
      },
    });

    const pointsMap = new Map<number, { points: number; count: number }>();
    redemptions.forEach((r) => {
      const current = pointsMap.get(r.userId) || { points: 0, count: 0 };
      current.points += r.channelReward.cost;
      current.count += 1;
      pointsMap.set(r.userId, current);
    });

    const sorted = Array.from(pointsMap.entries())
      .sort((a, b) => b[1].points - a[1].points)
      .slice(calculateOffset(page, limit), calculateOffset(page, limit) + limit);

    const userIds = sorted.map(([userId]) => userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        twitchId: true,
        login: true,
        displayName: true,
        avatar: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      users: sorted.map(([userId, { points, count }]) => {
        const user = userMap.get(userId)!;
        return {
          id: user.id,
          twitchId: user.twitchId,
          login: user.login,
          displayName: user.displayName,
          avatar: user.avatar,
          totalMessages: 0,
          totalWatchTime: 0,
          totalPointsSpent: points,
          totalRedemptions: count,
        };
      }),
      total: pointsMap.size,
    };
  }

  async getTopRewards(page: number, limit: number, timeRange: TimeRange = "all"): Promise<{ rewards: LeaderboardReward[]; total: number }> {
    const offset = calculateOffset(page, limit);
    const startDate = getDateFromRange(timeRange);

    const whereClause = startDate ? { timestamp: { gte: startDate } } : {};

    const rewards = await prisma.channelReward.findMany({
      select: {
        id: true,
        twitchId: true,
        title: true,
        cost: true,
        imageUrl: true,
        redemptions: {
          where: whereClause,
          select: { id: true },
        },
      },
    });

    const rewardsWithTotals = rewards
      .map((reward) => ({
        id: reward.id,
        twitchId: reward.twitchId,
        title: reward.title,
        cost: reward.cost,
        imageUrl: reward.imageUrl,
        totalRedemptions: reward.redemptions.length,
        totalPointsSpent: reward.redemptions.length * reward.cost,
      }))
      .filter((r) => r.totalRedemptions > 0)
      .sort((a, b) => b.totalRedemptions - a.totalRedemptions);

    const total = rewardsWithTotals.length;
    const paginated = rewardsWithTotals.slice(offset, offset + limit);

    return { rewards: paginated, total };
  }

  // Get leaderboard for a specific reward (who redeemed it most)
  async getRewardLeaderboard(rewardId: number, page: number, limit: number, timeRange: TimeRange = "all"): Promise<RewardUserLeaderboard | null> {
    const startDate = getDateFromRange(timeRange);

    const reward = await prisma.channelReward.findUnique({
      where: { id: rewardId },
      select: {
        id: true,
        twitchId: true,
        title: true,
        cost: true,
        imageUrl: true,
      },
    });

    if (!reward) return null;

    const whereClause: any = { channelReward: { id: rewardId } };
    if (startDate) {
      whereClause.timestamp = { gte: startDate };
    }

    const redemptionCounts = await prisma.redemption.groupBy({
      by: ["userId"],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      skip: calculateOffset(page, limit),
      take: limit,
    });

    const totalUsers = await prisma.redemption.groupBy({
      by: ["userId"],
      where: whereClause,
    });

    const userIds = redemptionCounts.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        twitchId: true,
        login: true,
        displayName: true,
        avatar: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      reward,
      users: redemptionCounts.map((r) => {
        const user = userMap.get(r.userId)!;
        return {
          id: user.id,
          twitchId: user.twitchId,
          login: user.login,
          displayName: user.displayName,
          avatar: user.avatar,
          redemptionCount: r._count.id,
          totalPointsSpent: r._count.id * reward.cost,
        };
      }),
      total: totalUsers.length,
    };
  }

  // Get all rewards with their top redeemers (for reward leaderboards overview)
  async getAllRewardLeaderboards(timeRange: TimeRange = "all"): Promise<RewardUserLeaderboard[]> {
    const rewards = await prisma.channelReward.findMany({
      select: {
        id: true,
        twitchId: true,
        title: true,
        cost: true,
        imageUrl: true,
      },
    });

    const results: RewardUserLeaderboard[] = [];

    for (const reward of rewards) {
      const leaderboard = await this.getRewardLeaderboard(reward.id, 1, 3, timeRange);
      if (leaderboard && leaderboard.users.length > 0) {
        results.push(leaderboard);
      }
    }

    // Sort by total redemptions of top user
    results.sort((a, b) => {
      const aTop = a.users[0]?.redemptionCount || 0;
      const bTop = b.users[0]?.redemptionCount || 0;
      return bTop - aTop;
    });

    return results;
  }

  async getTopGames(page: number, limit: number, timeRange: TimeRange = "all"): Promise<{ games: LeaderboardGame[]; total: number }> {
    const startDate = getDateFromRange(timeRange);
    const segmentWhere = startDate ? { startTime: { gte: startDate } } : {};

    const gamesWithStats = await prisma.game.findMany({
      select: {
        id: true,
        twitchId: true,
        name: true,
        boxArtUrl: true,
        segments: {
          where: segmentWhere,
          select: {
            startTime: true,
            endTime: true,
            stream: {
              select: { id: true },
            },
          },
        },
      },
    });

    const formattedGames: LeaderboardGame[] = gamesWithStats
      .map((game) => {
        const totalWatchTime = game.segments.reduce((acc, segment) => {
          if (segment.endTime) {
            const duration = (segment.endTime.getTime() - segment.startTime.getTime()) / (1000 * 60);
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
      })
      .filter((g) => g.totalWatchTime > 0)
      .sort((a, b) => b.totalWatchTime - a.totalWatchTime);

    const total = formattedGames.length;
    const paginated = formattedGames.slice(calculateOffset(page, limit), calculateOffset(page, limit) + limit);

    return { games: paginated, total };
  }

  // Get list of available platforms for emote filtering
  async getEmotePlatforms(): Promise<string[]> {
    const platforms = await prisma.emote.findMany({
      distinct: ["platform"],
      select: { platform: true },
    });
    return platforms.map((p) => p.platform);
  }
}
