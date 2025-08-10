import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

// Basic health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "vaarattu-web-api" });
});

// API routes will go here
app.get("/api/users", (req, res) => {
  res.json({ message: "Users endpoint - coming soon!" });
});

app.listen(PORT, () => {
  console.log(`Web API server running on port ${PORT}`);
});
