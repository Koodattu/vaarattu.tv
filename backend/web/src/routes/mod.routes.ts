import { Router } from "express";
import { ModController } from "../controllers/mod.controller";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
const modController = new ModController();

// GET /api/mod/users/:userId/messages - Get all messages from a specific user
// Query params: page, limit, search, streamId
router.get("/users/:userId/messages", asyncHandler(modController.getUserMessages.bind(modController)));

// GET /api/mod/messages/search - Search messages across all users
// Query params: search (required), page, limit, streamId, userId
router.get("/messages/search", asyncHandler(modController.searchMessages.bind(modController)));

export default router;
