import { Router } from "express";
import { LeaderboardController } from "../controllers/leaderboard.controller";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
const leaderboardController = new LeaderboardController();

// GET /api/leaderboards/summary - Get top 3 of each category (for main leaderboards page)
// Query params: timeRange=all|year|month|week
router.get("/summary", asyncHandler(leaderboardController.getSummary.bind(leaderboardController)));

// GET /api/leaderboards/emotes - Top emotes by usage
// Query params: page, limit, timeRange, platform
router.get("/emotes", asyncHandler(leaderboardController.getTopEmotes.bind(leaderboardController)));

// GET /api/leaderboards/emotes/platforms - List of available emote platforms
router.get("/emotes/platforms", asyncHandler(leaderboardController.getEmotePlatforms.bind(leaderboardController)));

// GET /api/leaderboards/users - Top users by messages/watchtime/points
// Query params: sortBy=messages|watchtime|points, page, limit, timeRange
router.get("/users", asyncHandler(leaderboardController.getTopUsers.bind(leaderboardController)));

// GET /api/leaderboards/rewards - Top rewards by redemptions
// Query params: page, limit, timeRange
router.get("/rewards", asyncHandler(leaderboardController.getTopRewards.bind(leaderboardController)));

// GET /api/leaderboards/rewards/all - All rewards with their top redeemers
// Query params: timeRange
router.get("/rewards/all", asyncHandler(leaderboardController.getAllRewardLeaderboards.bind(leaderboardController)));

// GET /api/leaderboards/rewards/:rewardId - Leaderboard for a specific reward
// Query params: page, limit, timeRange
router.get("/rewards/:rewardId", asyncHandler(leaderboardController.getRewardLeaderboard.bind(leaderboardController)));

// GET /api/leaderboards/games - Top games by total watch time
// Query params: page, limit, timeRange
router.get("/games", asyncHandler(leaderboardController.getTopGames.bind(leaderboardController)));

export default router;
