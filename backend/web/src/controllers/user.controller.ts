import { Request, Response } from "express";
import { parsePositiveInteger, parseTextQuery } from "../utils/validation";
import { UserService } from "../services/user.service";
import { ApiResponse } from "../types/api.types";
import { parsePaginationQuery, createPaginationInfo } from "../utils/pagination";

const userService = new UserService();

export class UserController {
  async getRandomUsers(req: Request, res: Response<ApiResponse>) {
    const limit = Math.min(parsePositiveInteger(req.query.limit, "Limit", 18), 50);

    const users = await userService.getRandomUsers(limit);

    res.json({
      success: true,
      data: users,
    });
  }

  async getUsers(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);
    const search = parseTextQuery(req.query.search, "Search");

    const { users, total } = await userService.getUsers(page, limit, search);

    res.json({
      success: true,
      data: users,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async getUserProfile(req: Request, res: Response<ApiResponse>) {
    const userId = parsePositiveInteger(req.params.id, "ID");

    const profile = await userService.getUserProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  }

  async getUserProfileByLogin(req: Request, res: Response<ApiResponse>) {
    const login = req.params.login;

    if (!login) {
      return res.status(400).json({
        success: false,
        error: "Login required",
      });
    }

    const profile = await userService.getUserByLogin(login);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  }

  async getUserViewSessions(req: Request, res: Response<ApiResponse>) {
    const userId = parsePositiveInteger(req.params.id, "ID");

    const sessions = await userService.getUserViewSessions(userId);

    res.json({
      success: true,
      data: sessions,
    });
  }
}
