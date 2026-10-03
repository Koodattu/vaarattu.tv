import { Request, Response } from "express";
import { parsePositiveInteger, parseOptionalId, parseTextQuery } from "../utils/validation";
import { ModService } from "../services/mod.service";
import { ApiResponse } from "../types/api.types";
import { parsePaginationQuery, createPaginationInfo } from "../utils/pagination";

const modService = new ModService();

export class ModController {
  async getUserMessages(req: Request, res: Response<ApiResponse>) {
    const userId = parsePositiveInteger(req.params.userId, "ID");
    const { page, limit } = parsePaginationQuery(req.query);
    const search = parseTextQuery(req.query.search, "Search");
    const streamId = parseOptionalId(req.query.streamId, "Stream ID");

    const { messages, total } = await modService.getUserMessages(userId, page, limit, search, streamId);

    res.json({
      success: true,
      data: messages,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async searchMessages(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);
    const search = parseTextQuery(req.query.search, "Search");
    const streamId = parseOptionalId(req.query.streamId, "Stream ID");
    const userId = parseOptionalId(req.query.userId, "User ID");

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
