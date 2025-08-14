import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";

// Route imports
import leaderboardRoutes from "./routes/leaderboard.routes";
import userRoutes from "./routes/user.routes";
import streamRoutes from "./routes/stream.routes";
import modRoutes from "./routes/mod.routes";

// Smart .env loading for both development and production
const envPath =
  process.env.NODE_ENV === "production"
    ? ".env" // Production: .env in working directory
    : "../.env"; // Development: .env in parent directory

dotenv.config({ path: envPath, quiet: true });

const app = express();
const PORT = process.env.WEB_API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/leaderboards", leaderboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/streams", streamRoutes);
app.use("/api/mod", modRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 vaarattu.tv Web API server running on port ${PORT}`);
});
