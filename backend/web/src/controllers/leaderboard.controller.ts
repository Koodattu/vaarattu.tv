import { Request, Response } from "express";
import { LeaderboardService, TimeRange } from "../services/leaderboard.service";
import { ApiResponse } from "../types/api.types";
import { parsePaginationQuery, createPaginationInfo } from "../utils/pagination";

const leaderboardService = new LeaderboardService();

function parseTimeRange(query: any): TimeRange {
  const range = query.timeRange as string;
  if (range === "year" || range === "month" || range === "week") {
    return range;
  }
  return "all";
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
    const platform = req.query.platform as string | undefined;

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
    const sortBy = req.query.sortBy as "messages" | "watchtime" | "points" | undefined;
    const timeRange = parseTimeRange(req.query);

    const { users, total } = await leaderboardService.getTopUsers(page, limit, sortBy, timeRange);

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

  async getRewardLeaderboard(req: Request, res: Response<ApiResponse>) {
    const rewardId = parseInt(req.params.rewardId);
    if (isNaN(rewardId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid reward ID",
      });
    }

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
