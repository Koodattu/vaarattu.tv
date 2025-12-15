import { Router } from "express";
import { StreamController } from "../controllers/stream.controller";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
const streamController = new StreamController();

// GET /api/streams - List all streams with basic info
// Query params: page, limit
router.get("/", asyncHandler(streamController.getStreams.bind(streamController)));

// GET /api/streams/:id - Get single stream details
router.get("/:id", asyncHandler(streamController.getStream.bind(streamController)));

// GET /api/streams/:id/timeline - Get detailed stream timeline (mod only for now)
router.get("/:id/timeline", asyncHandler(streamController.getStreamTimeline.bind(streamController)));

export default router;
