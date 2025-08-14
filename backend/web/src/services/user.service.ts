import prisma from "../prismaClient";
import { UserListItem, UserProfile } from "../types/api.types";
import { calculateOffset } from "../utils/pagination";

export class UserService {
  async getUsers(page: number, limit: number, search?: string): Promise<{ users: UserListItem[]; total: number }> {
    const offset = calculateOffset(page, limit);

    const whereClause = search
      ? {
          OR: [{ login: { contains: search, mode: "insensitive" as const } }, { displayName: { contains: search, mode: "insensitive" as const } }],
        }
      : {};

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
              lastSeen: true,
            },
          },
          twitchProfile: {
            select: {
              isFollowing: true,
              isSubscribed: true,
              isModerator: true,
              isVip: true,
            },
          },
        },
        where: whereClause,
        orderBy: {
          viewerProfile: {
            totalMessages: "desc",
          },
        },
        skip: offset,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    const formattedUsers: UserListItem[] = users.map((user) => ({
      id: user.id,
      twitchId: user.twitchId,
      login: user.login,
      displayName: user.displayName,
      avatar: user.avatar,
      totalMessages: user.viewerProfile?.totalMessages || 0,
      totalWatchTime: user.viewerProfile?.totalWatchTime || 0,
      lastSeen: user.viewerProfile?.lastSeen || null,
      isFollowing: user.twitchProfile?.isFollowing,
      isSubscribed: user.twitchProfile?.isSubscribed,
      isModerator: user.twitchProfile?.isModerator,
      isVip: user.twitchProfile?.isVip,
    }));

    return { users: formattedUsers, total };
  }

  async getUserProfile(userId: number): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twitchId: true,
        login: true,
        displayName: true,
        avatar: true,
        viewerProfile: {
          select: {
            aiSummary: true,
            aiSummaryLastUpdate: true,
            totalMessages: true,
            totalWatchTime: true,
            totalRedemptions: true,
            totalPointsSpent: true,
            averageSessionTime: true,
            lastSeen: true,
            topEmotes: {
              select: {
                rank: true,
                usageCount: true,
                emote: {
                  select: {
                    name: true,
                    platform: true,
                    imageUrl: true,
                  },
                },
              },
              orderBy: { rank: "asc" },
            },
            topGames: {
              select: {
                rank: true,
                watchTime: true,
                game: {
                  select: {
                    name: true,
                    boxArtUrl: true,
                  },
                },
              },
              orderBy: { rank: "asc" },
            },
            topRewards: {
              select: {
                rank: true,
                redemptionCount: true,
                totalPointsSpent: true,
                reward: {
                  select: {
                    title: true,
                    cost: true,
                    imageUrl: true,
                  },
                },
              },
              orderBy: { rank: "asc" },
            },
          },
        },
        twitchProfile: {
          select: {
            isFollowing: true,
            isSubscribed: true,
            isModerator: true,
            isVip: true,
          },
        },
        nameHistory: {
          select: {
            previousName: true,
            detectedAt: true,
          },
          orderBy: { detectedAt: "desc" },
        },
      },
    });

    if (!user || !user.viewerProfile) {
      return null;
    }

    return {
      id: user.id,
      twitchId: user.twitchId,
      login: user.login,
      displayName: user.displayName,
      avatar: user.avatar,
      totalMessages: user.viewerProfile.totalMessages,
      totalWatchTime: user.viewerProfile.totalWatchTime,
      totalRedemptions: user.viewerProfile.totalRedemptions,
      totalPointsSpent: user.viewerProfile.totalPointsSpent,
      averageSessionTime: user.viewerProfile.averageSessionTime,
      lastSeen: user.viewerProfile.lastSeen,
      aiSummary: user.viewerProfile.aiSummary,
      aiSummaryLastUpdate: user.viewerProfile.aiSummaryLastUpdate,
      isFollowing: user.twitchProfile?.isFollowing,
      isSubscribed: user.twitchProfile?.isSubscribed,
      isModerator: user.twitchProfile?.isModerator,
      isVip: user.twitchProfile?.isVip,
      topEmotes: user.viewerProfile.topEmotes.map((te) => ({
        name: te.emote.name,
        platform: te.emote.platform,
        imageUrl: te.emote.imageUrl,
        usageCount: te.usageCount,
        rank: te.rank,
      })),
      topGames: user.viewerProfile.topGames.map((tg) => ({
        name: tg.game.name,
        boxArtUrl: tg.game.boxArtUrl,
        watchTime: tg.watchTime,
        rank: tg.rank,
      })),
      topRewards: user.viewerProfile.topRewards.map((tr) => ({
        title: tr.reward.title,
        cost: tr.reward.cost,
        imageUrl: tr.reward.imageUrl,
        redemptionCount: tr.redemptionCount,
        totalPointsSpent: tr.totalPointsSpent,
        rank: tr.rank,
      })),
      nameHistory: user.nameHistory.map((nh) => ({
        previousName: nh.previousName,
        detectedAt: nh.detectedAt,
      })),
    };
  }

  async getUserByLogin(login: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { login: login.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    return this.getUserProfile(user.id);
  }
}
