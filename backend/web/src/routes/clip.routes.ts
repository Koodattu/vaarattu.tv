import { Router } from "express";
import { listClips, showClip } from "../controllers/clip.controller";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
router.get("/", asyncHandler(listClips));
router.get("/:id", asyncHandler(showClip));
export default router;
