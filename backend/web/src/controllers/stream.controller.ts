import { Request, Response } from "express";
import { StreamService } from "../services/stream.service";
import { ApiResponse } from "../types/api.types";
import { parsePaginationQuery, createPaginationInfo } from "../utils/pagination";
import { getChatReplay, parseReplayQuery } from "../services/chatReplay.service";

import { StreamSearchService, parseSearchQuery } from "../services/streamSearch.service";

const streamService = new StreamService();
const streamSearch = new StreamSearchService();

export class StreamController {
  async searchStreams(req: Request, res: Response<ApiResponse>) {
    const query = parseSearchQuery(req.query);
    if (!query) return res.status(400).json({ success: false, error: "Enter a VOD title or YouTube video ID; limit must be 1–10." });
    res.json({ success: true, data: await streamSearch.search(query) });
  }

  async getChatReplay(req: Request, res: Response<ApiResponse>) {
    const streamId = Number(req.params.id);
    const query = parseReplayQuery(req.query);
    if (!Number.isSafeInteger(streamId) || streamId <= 0 || streamId > 2147483647 || !query) {
      return res.status(400).json({ success: false, error: "Invalid chat replay request" });
    }
    const replay = await getChatReplay(streamId, query);
    if (!replay) return res.status(404).json({ success: false, error: "Stream not found" });
    res.json({ success: true, data: replay });
  }

  async getStreamActivity(req: Request, res: Response<ApiResponse>) {
    const streamId = Number(req.params.id);
    if (!Number.isSafeInteger(streamId) || streamId <= 0 || streamId > 2147483647) {
      return res.status(400).json({ success: false, error: "Invalid stream ID" });
    }
    const activity = await streamService.getStreamActivity(streamId);
    if (!activity) {
      return res.status(404).json({ success: false, error: "Stream not found" });
    }
    res.json({ success: true, data: activity });
  }

  async getStreams(req: Request, res: Response<ApiResponse>) {
    const { page, limit } = parsePaginationQuery(req.query);

    const { streams, total } = await streamService.getStreams(page, limit);

    res.json({
      success: true,
      data: streams,
      pagination: createPaginationInfo(page, limit, total),
    });
  }

  async getStream(req: Request, res: Response<ApiResponse>) {
    const streamId = parseInt(req.params.id);

    if (isNaN(streamId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid stream ID",
      });
    }

    const stream = await streamService.getStream(streamId);

    if (!stream) {
      return res.status(404).json({
        success: false,
        error: "Stream not found",
      });
    }

    res.json({
      success: true,
      data: stream,
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
