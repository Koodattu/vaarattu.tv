import { Request, Response } from "express";
import { StreamService } from "../services/stream.service";
import { ApiResponse } from "../types/api.types";
import { parsePaginationQuery, createPaginationInfo } from "../utils/pagination";

const streamService = new StreamService();

export class StreamController {
  async getStreams(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);

    const { streams, total } = await streamService.getStreams(page, limit);

    res.json({
      success: true,
      data: streams,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async getStreamTimeline(req: Request, res: Response<ApiResponse>) {
    const streamId = parseInt(req.params.id);

    if (isNaN(streamId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid stream ID",
      });
    }

    const timeline = await streamService.getStreamTimeline(streamId);

    if (!timeline) {
      return res.status(404).json({
        success: false,
        error: "Stream not found",
      });
    }

    res.json({
      success: true,
      data: timeline,
    });
  }
}
