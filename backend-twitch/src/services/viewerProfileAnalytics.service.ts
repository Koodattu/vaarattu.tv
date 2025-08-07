import prisma from "../prismaClient";
import { generateOrUpdateAISummary } from "./openai.service";

/**
 * Update analytics for all users who participated in the given stream.
 * Called when a stream ends to update cumulative statistics.
 */
export async function updateViewerAnalyticsForStream(streamId: number): Promise<void> {
  console.log(`[ViewerAnalytics] Starting analytics update for stream ${streamId}`);

  // Get all users who had activity during this stream
  const activeUserIds = await getActiveUsersInStream(streamId);

  if (activeUserIds.length === 0) {
    console.log(`[ViewerAnalytics] No active users found for stream ${streamId}`);
    return;
  }

  console.log(`[ViewerAnalytics] Updating analytics for ${activeUserIds.length} users`);

  // Process each user individually to avoid memory issues with large streams
  for (const userId of activeUserIds) {
    try {
      await updateUserAnalytics(userId, streamId);
    } catch (error) {
      console.error(`[ViewerAnalytics] Failed to update analytics for user ${userId}:`, error);
    }
  }

  console.log(`[ViewerAnalytics] Completed analytics update for stream ${streamId}`);
}

/**
 * Get all user IDs who had any activity during the stream
 */
async function getActiveUsersInStream(streamId: number): Promise<number[]> {
  // Get users from view sessions, messages, and redemptions
  const [sessionUsers, messageUsers, redemptionUsers] = await Promise.all([
    prisma.viewSession.findMany({
      where: { streamId },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.message.findMany({
      where: { streamId },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.redemption.findMany({
      where: { streamId },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  // Combine and deduplicate user IDs
  const allUserIds = new Set([...sessionUsers.map((u) => u.userId), ...messageUsers.map((u) => u.userId), ...redemptionUsers.map((u) => u.userId)]);

  return Array.from(allUserIds);
}

/**
 * Update all analytics for a single user
 */
async function updateUserAnalytics(userId: number, latestStreamId: number): Promise<void> {
  console.log(`[ViewerAnalytics] Updating analytics for user ${userId}`);

  // Ensure viewer profile exists
  await ensureViewerProfileExists(userId);

  // Calculate all analytics
  const [totalWatchTime, totalMessages, totalRedemptions, totalPointsSpent, averageSessionTime] = await Promise.all([
    calculateTotalWatchTime(userId),
    calculateTotalMessages(userId),
    calculateTotalRedemptions(userId),
    calculateTotalPointsSpent(userId),
    calculateAverageSessionTime(userId),
  ]);

  // Update basic analytics
  await prisma.viewerProfile.update({
    where: { userId },
    data: {
      totalWatchTime,
      totalMessages,
      totalRedemptions,
      totalPointsSpent,
      averageSessionTime,
      lastSeen: new Date(),
    },
  });

  // Update top favorites
  await Promise.all([updateTopEmotes(userId), updateTopGames(userId), updateTopRewards(userId)]);

  // Check if AI summary needs updating
  await checkAndUpdateAISummary(userId);

  console.log(`[ViewerAnalytics] Completed analytics update for user ${userId}`);
}

/**
 * Ensure viewer profile exists for the user
 */
async function ensureViewerProfileExists(userId: number): Promise<void> {
  const existing = await prisma.viewerProfile.findUnique({
    where: { userId },
  });

  if (!existing) {
    await prisma.viewerProfile.create({
      data: {
        userId,
        consent: true,
      },
    });
    console.log(`[ViewerAnalytics] Created new viewer profile for user ${userId}`);
  }
}

/**
 * Calculate total watch time across all sessions
 */
async function calculateTotalWatchTime(userId: number): Promise<number> {
  const sessions = await prisma.viewSession.findMany({
    where: {
      userId,
      sessionEnd: { not: null }, // Only count completed sessions
    },
    select: {
      sessionStart: true,
      sessionEnd: true,
    },
  });

  let totalMinutes = 0;
  for (const session of sessions) {
    if (session.sessionEnd) {
      const diffMs = session.sessionEnd.getTime() - session.sessionStart.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      totalMinutes += diffMinutes;
    }
  }

  return totalMinutes;
}

/**
 * Calculate total messages sent by user
 */
async function calculateTotalMessages(userId: number): Promise<number> {
  return await prisma.message.count({
    where: { userId },
  });
}

/**
 * Calculate total redemptions by user
 */
async function calculateTotalRedemptions(userId: number): Promise<number> {
  return await prisma.redemption.count({
    where: { userId },
  });
}

/**
 * Calculate total channel points spent by user
 */
async function calculateTotalPointsSpent(userId: number): Promise<number> {
  const redemptions = await prisma.redemption.findMany({
    where: { userId },
    include: {
      channelReward: {
        select: { cost: true },
      },
    },
  });

  return redemptions.reduce((total, redemption) => {
    return total + redemption.channelReward.cost;
  }, 0);
}

/**
 * Calculate average session time
 */
async function calculateAverageSessionTime(userId: number): Promise<number> {
  const sessions = await prisma.viewSession.findMany({
    where: {
      userId,
      sessionEnd: { not: null },
    },
    select: {
      sessionStart: true,
      sessionEnd: true,
    },
  });

  if (sessions.length === 0) return 0;

  let totalMinutes = 0;
  for (const session of sessions) {
    if (session.sessionEnd) {
      const diffMs = session.sessionEnd.getTime() - session.sessionStart.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      totalMinutes += diffMinutes;
    }
  }

  return Math.round(totalMinutes / sessions.length);
}

/**
 * Update top 3 emotes for user
 */
async function updateTopEmotes(userId: number): Promise<void> {
  // Get emote usage statistics
  const emoteStats = await prisma.emoteUsage.findMany({
    where: { userId },
    include: { emote: true },
    orderBy: { count: "desc" },
    take: 3,
  });

  // Clear existing top emotes
  await prisma.viewerProfileTopEmote.deleteMany({
    where: { viewerProfileId: userId },
  });

  // Insert new top emotes
  for (let i = 0; i < emoteStats.length; i++) {
    await prisma.viewerProfileTopEmote.create({
      data: {
        viewerProfileId: userId,
        emoteId: emoteStats[i].emoteId,
        usageCount: emoteStats[i].count,
        rank: i + 1,
      },
    });
  }

  console.log(`[ViewerAnalytics] Updated top ${emoteStats.length} emotes for user ${userId}`);
}

/**
 * Update top 3 games for user based on watch time
 */
async function updateTopGames(userId: number): Promise<void> {
  // Calculate watch time per game through stream segments and view sessions
  const gameWatchTime = await prisma.$queryRaw<Array<{ gameId: number; watchTimeMinutes: bigint }>>`
    SELECT
      ss."gameId" as "gameId",
      SUM(
        EXTRACT(EPOCH FROM (
          LEAST(
            COALESCE(vs."sessionEnd", NOW()),
            COALESCE(ss."endTime", NOW())
          ) - GREATEST(vs."sessionStart", ss."startTime")
        )) / 60
      )::INTEGER as "watchTimeMinutes"
    FROM "ViewSession" vs
    JOIN "Stream" s ON vs."streamId" = s.id
    JOIN "StreamSegment" ss ON s.id = ss."streamId"
    WHERE vs."userId" = ${userId}
      AND vs."sessionEnd" IS NOT NULL
      AND vs."sessionStart" < COALESCE(ss."endTime", NOW())
      AND COALESCE(vs."sessionEnd", NOW()) > ss."startTime"
    GROUP BY ss."gameId"
    ORDER BY "watchTimeMinutes" DESC
    LIMIT 3
  `;

  // Clear existing top games
  await prisma.viewerProfileTopGame.deleteMany({
    where: { viewerProfileId: userId },
  });

  // Insert new top games
  for (let i = 0; i < gameWatchTime.length; i++) {
    const watchTime = Number(gameWatchTime[i].watchTimeMinutes);
    if (watchTime > 0) {
      await prisma.viewerProfileTopGame.create({
        data: {
          viewerProfileId: userId,
          gameId: gameWatchTime[i].gameId,
          watchTime,
          rank: i + 1,
        },
      });
    }
  }

  console.log(`[ViewerAnalytics] Updated top ${gameWatchTime.length} games for user ${userId}`);
}

/**
 * Update top 3 channel point rewards for user based on redemption count
 */
async function updateTopRewards(userId: number): Promise<void> {
  // Get all redemptions for the user with reward details
  const redemptions = await prisma.redemption.findMany({
    where: { userId },
    include: {
      channelReward: {
        select: {
          id: true,
          twitchId: true,
          title: true,
          cost: true,
        },
      },
    },
  });

  // Calculate statistics per reward
  const rewardStatsMap = new Map<
    number,
    {
      rewardId: number;
      redemptionCount: number;
      totalPointsSpent: number;
      title: string;
    }
  >();

  for (const redemption of redemptions) {
    const rewardDbId = redemption.channelReward.id;
    const existing = rewardStatsMap.get(rewardDbId);

    if (existing) {
      existing.redemptionCount += 1;
      existing.totalPointsSpent += redemption.channelReward.cost;
    } else {
      rewardStatsMap.set(rewardDbId, {
        rewardId: rewardDbId,
        redemptionCount: 1,
        totalPointsSpent: redemption.channelReward.cost,
        title: redemption.channelReward.title,
      });
    }
  }

  // Sort by redemption count and take top 3
  const topRewards = Array.from(rewardStatsMap.values())
    .sort((a, b) => b.redemptionCount - a.redemptionCount)
    .slice(0, 3);

  // Clear existing top rewards
  await prisma.viewerProfileTopReward.deleteMany({
    where: { viewerProfileId: userId },
  });

  // Insert new top rewards
  for (let i = 0; i < topRewards.length; i++) {
    const reward = topRewards[i];

    await prisma.viewerProfileTopReward.create({
      data: {
        viewerProfileId: userId,
        rewardId: reward.rewardId,
        redemptionCount: reward.redemptionCount,
        totalPointsSpent: reward.totalPointsSpent,
        rank: i + 1,
      },
    });
  }

  console.log(`[ViewerAnalytics] Updated top ${topRewards.length} rewards for user ${userId}`);
}

/**
 * Check if AI summary needs updating and trigger generation if needed
 */
async function checkAndUpdateAISummary(userId: number): Promise<void> {
  const profile = await prisma.viewerProfile.findUnique({
    where: { userId },
    select: {
      totalMessages: true,
      aiSummaryGeneratedAtMessages: true,
      aiSummary: true,
      consent: true,
    },
  });

  if (!profile || !profile.consent) {
    return;
  }

  const messagesSinceLastSummary = profile.totalMessages - profile.aiSummaryGeneratedAtMessages;

  if (messagesSinceLastSummary >= 100) {
    console.log(`[ViewerAnalytics] User ${userId} needs AI summary update (${messagesSinceLastSummary} new messages)`);

    // Generate new AI summary with only new messages
    try {
      const aiSummary = await generateAISummary(userId, profile.aiSummary, profile.aiSummaryGeneratedAtMessages);

      await prisma.viewerProfile.update({
        where: { userId },
        data: {
          aiSummary: aiSummary,
          aiSummaryGeneratedAtMessages: profile.totalMessages,
          aiSummaryLastUpdate: new Date(),
        },
      });

      console.log(`[ViewerAnalytics] AI summary ${aiSummary ? "generated" : "generation failed"} for user ${userId}`);
    } catch (error) {
      console.error(`[ViewerAnalytics] Failed to generate AI summary for user ${userId}:`, error);

      // Still update the tracking field to avoid constant retries
      await prisma.viewerProfile.update({
        where: { userId },
        data: {
          aiSummaryGeneratedAtMessages: profile.totalMessages,
          aiSummaryLastUpdate: new Date(),
        },
      });
    }
  }
}

/**
 * Generate AI summary for a user based on their new messages since last generation
 */
export async function generateAISummary(userId: number, existingSummary: string | null = null, messagesGeneratedAt: number = 0): Promise<string | null> {
  // Get user information for username
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { login: true },
  });

  if (!user) {
    console.error(`[ViewerAnalytics] User ${userId} not found`);
    return null;
  }

  // Calculate how many messages to skip (messages that were already used for AI generation)
  const totalMessageCount = await prisma.message.count({
    where: { userId },
  });

  // Get only new messages since last AI generation
  const newMessages = await prisma.message.findMany({
    where: { userId },
    orderBy: { timestamp: "asc" },
    skip: messagesGeneratedAt, // Skip messages that were already processed
    select: {
      content: true,
      timestamp: true,
    },
  });

  if (newMessages.length === 0) {
    console.log(`[ViewerAnalytics] No new messages for user ${userId} since last AI generation`);
    return existingSummary;
  }

  console.log(`[ViewerAnalytics] Processing ${newMessages.length} new messages for user ${user.login} (${totalMessageCount} total messages)`);

  // Use OpenAI to generate or update the summary
  return await generateOrUpdateAISummary(user.login, existingSummary, newMessages);
}
