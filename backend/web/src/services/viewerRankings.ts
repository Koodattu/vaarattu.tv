import { Prisma } from "@vaarattu/shared";
import prisma from "../prismaClient";
import { calculateOffset } from "../utils/pagination";

type ViewerMetric = "messages" | "watchtime" | "points" | "gifts" | "cheers";

interface ViewerRanking {
  id: number;
  twitchId: string;
  login: string;
  displayName: string;
  avatar: string | null;
  rank: number;
  score: number;
  events: number;
  totalMessages: number;
  totalWatchTime: number;
  totalPointsSpent: number;
  totalRedemptions: number;
}

function metricQuery(metric: ViewerMetric, startDate: Date | null): Prisma.Sql {
  if (!startDate && (metric === "messages" || metric === "watchtime" || metric === "points")) {
    const column = { messages: Prisma.sql`"totalMessages"`, watchtime: Prisma.sql`"totalWatchTime"`, points: Prisma.sql`"totalPointsSpent"` }[metric];
    return Prisma.sql`SELECT "userId", ${column}::double precision AS score, "totalRedemptions"::int AS events FROM "ViewerProfile"`;
  }

  // Prisma stores UTC instants in timestamp-without-timezone columns. Bind UTC text
  // explicitly so the ranking does not depend on the database session timezone.
  const since = startDate ? Prisma.sql`AND "timestamp" >= ${startDate.toISOString()}::timestamp` : Prisma.empty;
  if (metric === "messages") {
    return Prisma.sql`SELECT "userId", COUNT(*)::double precision AS score, 0::int AS events
      FROM "Message" WHERE TRUE ${since} GROUP BY "userId"`;
  }
  if (metric === "watchtime") {
    const until = new Date().toISOString();
    return Prisma.sql`SELECT "userId", (SUM(EXTRACT(EPOCH FROM (
        LEAST("sessionEnd", ${until}::timestamp) - GREATEST("sessionStart", ${startDate!.toISOString()}::timestamp)
      ))) / 60)::double precision AS score, 0::int AS events
      FROM "ViewSession" WHERE "sessionStart" < ${until}::timestamp
        AND "sessionEnd" > ${startDate!.toISOString()}::timestamp AND "sessionEnd" > "sessionStart"
      GROUP BY "userId"`;
  }
  if (metric === "points") {
    return Prisma.sql`SELECT r."userId", SUM(reward.cost)::double precision AS score, COUNT(*)::int AS events
      FROM "Redemption" r JOIN "ChannelReward" reward ON reward."twitchId" = r."rewardId"
      WHERE TRUE ${since} GROUP BY r."userId"`;
  }
  const table = metric === "gifts" ? Prisma.sql`"SubscriptionGift"` : Prisma.sql`"Cheer"`;
  const amount = metric === "gifts" ? Prisma.sql`amount` : Prisma.sql`bits`;
  return Prisma.sql`SELECT "userId", SUM(${amount})::double precision AS score, COUNT(*)::int AS events
    FROM ${table} WHERE "userId" IS NOT NULL ${since} GROUP BY "userId"`;
}

/** Rank the whole population before name filtering; only the requested page leaves PostgreSQL. */
export async function getViewerRankings(metric: ViewerMetric, startDate: Date | null, page: number, limit: number, search?: string) {
  const ranked = Prisma.sql`WITH scores AS (${metricQuery(metric, startDate)}), ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY score DESC, "userId" ASC)::int AS rank FROM scores
  )`;
  // Literal substring matching: %, _ and backslashes are names, not SQL wildcards.
  const matching = search ? Prisma.sql`WHERE POSITION(LOWER(${search}) IN LOWER(u.login)) > 0
    OR POSITION(LOWER(${search}) IN LOWER(u."displayName")) > 0` : Prisma.empty;
  const [rows, totals] = await Promise.all([
    prisma.$queryRaw<ViewerRanking[]>(Prisma.sql`${ranked}
      SELECT u.id, u."twitchId", u.login, u."displayName", u.avatar, ranked.rank, ranked.score, ranked.events,
        COALESCE(p."totalMessages", 0) AS "totalMessages", COALESCE(p."totalWatchTime", 0) AS "totalWatchTime",
        COALESCE(p."totalPointsSpent", 0) AS "totalPointsSpent", COALESCE(p."totalRedemptions", 0) AS "totalRedemptions"
      FROM ranked JOIN "User" u ON u.id = ranked."userId" LEFT JOIN "ViewerProfile" p ON p."userId" = u.id
      ${matching} ORDER BY ranked.rank LIMIT ${limit} OFFSET ${calculateOffset(page, limit)}`),
    prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`${ranked}
      SELECT COUNT(*)::int AS total FROM ranked JOIN "User" u ON u.id = ranked."userId" ${matching}`),
  ]);
  return { rows, total: totals[0].total };
}
