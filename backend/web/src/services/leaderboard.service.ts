import prisma from "../prismaClient";
import { getViewerRankings } from "./viewerRankings";
import {
  LeaderboardCheer,
  LeaderboardEmote,
  LeaderboardUser,
  LeaderboardReward,
  LeaderboardGame,
  LeaderboardSubscriptionGift,
  RewardUserLeaderboard,
  LeaderboardSummary,
} from "../types/api.types";
import { calculateOffset } from "../utils/pagination";

import { getDateFromRange, TimeRange } from "../utils/leaderboardRange";
export type { TimeRange } from "../utils/leaderboardRange";

export class LeaderboardService {
  // Get summary with top 3 of each category for main leaderboards page
  async getSummary(timeRange: TimeRange = "all"): Promise<LeaderboardSummary> {
    const [topWatchtime, topMessages, topPointsSpent, topEmotesResult, topRewardsResult, topGiftedSubsResult, topCheersResult] = await Promise.all([
      this.getTopUsers(1, 3, "watchtime", timeRange),
      this.getTopUsers(1, 3, "messages", timeRange),
      this.getTopUsers(1, 3, "points", timeRange),
      this.getTopEmotes(1, 3, timeRange),
      this.getTopRewards(1, 3, timeRange),
      this.getTopSubscriptionGifters(1, 3, timeRange),
      this.getTopCheers(1, 3, timeRange),
    ]);

    return {
      topWatchtime: topWatchtime.users,
      topMessages: topMessages.users,
      topPointsSpent: topPointsSpent.users,
      topEmotes: topEmotesResult.emotes,
      topRewards: topRewardsResult.rewards,
      topGiftedSubs: topGiftedSubsResult.gifters,
      topCheers: topCheersResult.cheers,
    };
  }

  async getTopEmotes(page: number, limit: number, timeRange: TimeRange = "all", platform?: string): Promise<{ emotes: LeaderboardEmote[]; total: number }> {
    // EmoteUsage has no timestamp; these rankings are always all-time.
    const [usage, total] = await Promise.all([
      prisma.emoteUsage.groupBy({
        by: ["emoteId"],
        where: { emote: { platform } },
        _sum: { count: true },
        orderBy: [{ _sum: { count: "desc" } }, { emoteId: "asc" }],
        skip: calculateOffset(page, limit),
        take: limit,
      }),
      prisma.emote.count({ where: { platform, emoteUsages: { some: {} } } }),
    ]);
    const emotes = await prisma.emote.findMany({
      where: { id: { in: usage.map(row => row.emoteId) } },
      select: { id: true, name: true, platform: true, imageUrl: true },
    });
    const emoteMap = new Map(emotes.map(emote => [emote.id, emote]));
    return {
      emotes: usage.map(row => ({ ...emoteMap.get(row.emoteId)!, totalUsage: row._sum.count ?? 0 })),
      total,
    };
  }
  async getTopUsers(
    page: number,
    limit: number,
    sortBy: "messages" | "watchtime" | "points" = "messages",
    timeRange: TimeRange = "all",
    search?: string
  ): Promise<{ users: LeaderboardUser[]; total: number }> {
    const { rows, total } = await getViewerRankings(sortBy, getDateFromRange(timeRange), page, limit, search);
    return {
      users: rows.map(row => ({
        id: row.id, twitchId: row.twitchId, login: row.login, displayName: row.displayName, avatar: row.avatar, rank: row.rank,
        totalMessages: timeRange === "all" ? row.totalMessages : sortBy === "messages" ? row.score : 0,
        totalWatchTime: timeRange === "all" ? row.totalWatchTime : sortBy === "watchtime" ? Math.round(row.score) : 0,
        totalPointsSpent: timeRange === "all" ? row.totalPointsSpent : sortBy === "points" ? row.score : 0,
        totalRedemptions: timeRange === "all" ? row.totalRedemptions : sortBy === "points" ? row.events : 0,
      })),
      total,
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

  async getTopSubscriptionGifters(page: number, limit: number, timeRange: TimeRange = "all", search?: string): Promise<{ gifters: LeaderboardSubscriptionGift[]; total: number }> {
    const { rows, total } = await getViewerRankings("gifts", getDateFromRange(timeRange), page, limit, search);
    return {
      gifters: rows.map(row => ({
        id: row.id, twitchId: row.twitchId, login: row.login, displayName: row.displayName, avatar: row.avatar, rank: row.rank,
        totalGiftedSubs: row.score, giftEvents: row.events,
      })),
      total,
    };
  }

  async getTopCheers(page: number, limit: number, timeRange: TimeRange = "all", search?: string): Promise<{ cheers: LeaderboardCheer[]; total: number }> {
    const { rows, total } = await getViewerRankings("cheers", getDateFromRange(timeRange), page, limit, search);
    return {
      cheers: rows.map(row => ({
        id: row.id, twitchId: row.twitchId, login: row.login, displayName: row.displayName, avatar: row.avatar, rank: row.rank,
        totalBits: row.score, cheerCount: row.events,
      })),
      total,
    };
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
      orderBy: [{ _count: { id: "desc" } }, { userId: "asc" }],
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
