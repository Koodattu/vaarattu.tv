import { Request, Response } from "express";
import { ModService } from "../services/mod.service";
import { ApiResponse } from "../types/api.types";
import { parsePaginationQuery, createPaginationInfo } from "../utils/pagination";

const modService = new ModService();

export class ModController {
  async getUserMessages(req: Request, res: Response<ApiResponse>) {
    const userId = parseInt(req.params.userId);
    const { page, limit } = parsePaginationQuery(req.query);
    const search = req.query.search as string | undefined;
    const streamId = req.query.streamId ? parseInt(req.query.streamId as string) : undefined;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    const { messages, total } = await modService.getUserMessages(userId, page, limit, search, streamId);

    res.json({
      success: true,
      data: messages,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async searchMessages(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);
    const search = req.query.search as string;
    const streamId = req.query.streamId ? parseInt(req.query.streamId as string) : undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    if (!search) {
      return res.status(400).json({
        success: false,
        error: "Search query required",
      });
    }

    const { messages, total } = await modService.searchMessages(search, page, limit, streamId, userId);

    res.json({
      success: true,
      data: messages,
      pagination: createPaginationInfo(page, limit, total),
    });
  }
}
