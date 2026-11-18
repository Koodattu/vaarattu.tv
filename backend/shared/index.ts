import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: {
      provider: "postgres",
      adapterName: "@prisma/adapter-pg",
      async connect() {
        // Resolve at first use so each service can finish loading its environment.
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) throw new Error("DATABASE_URL is required");
        const params = new URL(connectionString).searchParams;
        const limit = params.get("connection_limit");
        const max = limit === null ? undefined : Number(limit);
        if (max !== undefined && (!Number.isSafeInteger(max) || max < 1)) {
          throw new Error("DATABASE_URL connection_limit must be a positive integer");
        }
        return new PrismaPg({ connectionString, max }, {
          schema: params.get("schema") ?? undefined,
        }).connect();
      },
    },
  });
}

// Export generated types (these will be available after running prisma generate)
export * from "@prisma/client";
export { parseTitle, rankMatches, MatchStream, MatchVideo } from "./youtubeMatching";
