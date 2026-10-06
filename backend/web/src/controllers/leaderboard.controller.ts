import { Request, Response } from "express";
import { parsePositiveInteger, parseTextQuery, parseChoice } from "../utils/validation";
import { LeaderboardService, TimeRange } from "../services/leaderboard.service";
import { ApiResponse } from "../types/api.types";
import { parsePaginationQuery, createPaginationInfo } from "../utils/pagination";

const leaderboardService = new LeaderboardService();

function parseTimeRange(query: Record<string, unknown>): TimeRange {
  return parseChoice(query.timeRange, "time range", ["all", "year", "month", "week"] as const, "all");
}

export class LeaderboardController {
  async getSummary(req: Request, res: Response<ApiResponse>) {
    const timeRange = parseTimeRange(req.query);

    const summary = await leaderboardService.getSummary(timeRange);

    res.json({
      success: true,
      data: summary,
    });
  }

  async getTopEmotes(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);
    const timeRange = parseTimeRange(req.query);
    const platform = parseTextQuery(req.query.platform, "Platform", 40);

    const { emotes, total } = await leaderboardService.getTopEmotes(page, limit, timeRange, platform);

    res.json({
      success: true,
      data: emotes,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async getEmotePlatforms(req: Request, res: Response<ApiResponse>) {
    const platforms = await leaderboardService.getEmotePlatforms();

    res.json({
      success: true,
      data: platforms,
    });
  }

  async getTopUsers(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);
    const sortBy = parseChoice(req.query.sortBy, "sort order", ["messages", "watchtime", "points"] as const, "messages");
    const timeRange = parseTimeRange(req.query);

    const search = parseTextQuery(req.query.search, "Search");
    const { users, total } = await leaderboardService.getTopUsers(page, limit, sortBy, timeRange, search);

    res.json({
      success: true,
      data: users,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async getTopRewards(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);
    const timeRange = parseTimeRange(req.query);

    const { rewards, total } = await leaderboardService.getTopRewards(page, limit, timeRange);

    res.json({
      success: true,
      data: rewards,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async getTopSubscriptionGifters(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);
    const timeRange = parseTimeRange(req.query);

    const search = parseTextQuery(req.query.search, "Search");
    const { gifters, total } = await leaderboardService.getTopSubscriptionGifters(page, limit, timeRange, search);

    res.json({
      success: true,
      data: gifters,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async getTopCheers(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);
    const timeRange = parseTimeRange(req.query);

    const search = parseTextQuery(req.query.search, "Search");
    const { cheers, total } = await leaderboardService.getTopCheers(page, limit, timeRange, search);

    res.json({
      success: true,
      data: cheers,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async getRewardLeaderboard(req: Request, res: Response<ApiResponse>) {
    const rewardId = parsePositiveInteger(req.params.rewardId, "ID");

    const { page, limit } = parsePaginationQuery(req.query);
    const timeRange = parseTimeRange(req.query);

    const leaderboard = await leaderboardService.getRewardLeaderboard(rewardId, page, limit, timeRange);

    if (!leaderboard) {
      return res.status(404).json({
        success: false,
        error: "Reward not found",
      });
    }

    res.json({
      success: true,
      data: leaderboard,
      pagination: createPaginationInfo(page, limit, leaderboard.total),
    });
  }

  async getAllRewardLeaderboards(req: Request, res: Response<ApiResponse>) {
    const timeRange = parseTimeRange(req.query);

    const leaderboards = await leaderboardService.getAllRewardLeaderboards(timeRange);

    res.json({
      success: true,
      data: leaderboards,
    });
  }

  async getTopGames(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);
    const timeRange = parseTimeRange(req.query);

    const { games, total } = await leaderboardService.getTopGames(page, limit, timeRange);

    res.json({
      success: true,
      data: games,
      pagination: createPaginationInfo(page, limit, total),
    });
  }
}
