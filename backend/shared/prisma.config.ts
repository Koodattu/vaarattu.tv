import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Compose injects DATABASE_URL. Local CLI commands also support the backend .env.
if (!process.env.DATABASE_URL) {
  for (const path of [".env", "../.env"]) {
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL },
});
