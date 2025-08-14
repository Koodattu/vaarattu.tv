import { Router } from "express";
import { LeaderboardController } from "../controllers/leaderboard.controller";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
const leaderboardController = new LeaderboardController();

// GET /api/leaderboards/emotes - Top emotes by usage
router.get("/emotes", asyncHandler(leaderboardController.getTopEmotes.bind(leaderboardController)));

// GET /api/leaderboards/users - Top users by messages/watchtime/points
// Query params: sortBy=messages|watchtime|points
router.get("/users", asyncHandler(leaderboardController.getTopUsers.bind(leaderboardController)));

// GET /api/leaderboards/rewards - Top rewards by redemptions
router.get("/rewards", asyncHandler(leaderboardController.getTopRewards.bind(leaderboardController)));

// GET /api/leaderboards/games - Top games by total watch time
router.get("/games", asyncHandler(leaderboardController.getTopGames.bind(leaderboardController)));

export default router;
