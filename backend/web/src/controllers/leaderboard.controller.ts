import { Request, Response } from "express";
import { LeaderboardService } from "../services/leaderboard.service";
import { ApiResponse } from "../types/api.types";
import { parsePaginationQuery, createPaginationInfo } from "../utils/pagination";

const leaderboardService = new LeaderboardService();

export class LeaderboardController {
  async getTopEmotes(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);

    const { emotes, total } = await leaderboardService.getTopEmotes(page, limit);

    res.json({
      success: true,
      data: emotes,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async getTopUsers(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);
    const sortBy = req.query.sortBy as "messages" | "watchtime" | "points" | undefined;

    const { users, total } = await leaderboardService.getTopUsers(page, limit, sortBy);

    res.json({
      success: true,
      data: users,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async getTopRewards(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);

    const { rewards, total } = await leaderboardService.getTopRewards(page, limit);

    res.json({
      success: true,
      data: rewards,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async getTopGames(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);

    const { games, total } = await leaderboardService.getTopGames(page, limit);

    res.json({
      success: true,
      data: games,
      pagination: createPaginationInfo(page, limit, total),
    });
  }
}
