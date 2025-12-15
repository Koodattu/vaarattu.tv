import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();
const userController = new UserController();

// GET /api/users/random - Get random users
// Query params: limit (max 50, default 18)
router.get("/random", asyncHandler(userController.getRandomUsers.bind(userController)));

// GET /api/users - List all users with basic info
// Query params: page, limit, search
router.get("/", asyncHandler(userController.getUsers.bind(userController)));

// GET /api/users/login/:login - Get full user profile by login (must come before /:id)
router.get("/login/:login", asyncHandler(userController.getUserProfileByLogin.bind(userController)));

// GET /api/users/:id - Get full user profile by ID
router.get("/:id", asyncHandler(userController.getUserProfile.bind(userController)));

export default router;
