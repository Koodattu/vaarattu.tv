const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
assert.equal(process.env.VOD_TEST_DATABASE_URL, "postgresql://postgres@127.0.0.1:55489/postgres");
process.env.DATABASE_URL = process.env.VOD_TEST_DATABASE_URL;
require("../../backend/web/node_modules/ts-node").register({ project: path.join(__dirname, "../../backend/web/tsconfig.json") });
const prismaModule = require("../../backend/web/src/prismaClient");
const prisma = prismaModule.default;
const { LeaderboardService } = require("../../backend/web/src/services/leaderboard.service");
(async () => {
  const rollback = new Error("Rollback benchmark");
  try {
    await prisma.$transaction(async db => {
      const now = new Date();
      const stream = await db.stream.create({ data: { twitchId: "benchmark-stream", startTime: new Date(now - 86400000), endTime: now } });
      await db.user.createMany({ data: Array.from({ length: 50 }, (_, i) => ({ twitchId: `benchmark-${i}`, login: `benchmark-${i}`, displayName: `Benchmark ${i}` })) });
      const users = await db.user.findMany({ where: { twitchId: { startsWith: "benchmark-" } }, select: { id: true } });
      await db.viewSession.createMany({ data: users.flatMap(user => Array.from({ length: 200 }, (_, i) => ({ userId: user.id, streamId: stream.id, sessionStart: new Date(now - 86400000 + i * 120000), sessionEnd: new Date(now - 86400000 + i * 120000 + 60000) }))) });
      prismaModule.default = db;
      const service = new LeaderboardService();
      const timings = [];
      try {
        for (let i = 0; i < 7; i++) {
          const start = performance.now();
          const result = await service.getTopUsers(1, 10, "watchtime", "week");
          assert.equal(result.users.length, 10);
          assert.equal(result.users[0].totalWatchTime, 200);
          timings.push(Number((performance.now() - start).toFixed(2)));
        }
      } finally { prismaModule.default = prisma; }
      const sortedWarm = timings.slice(1).sort((a, b) => a - b);
      const output = { workload: "50 viewers x 200 completed one-minute sessions (10,000 rows), top 10 past week", database: "PostgreSQL 17.10, Docker 1 CPU/384MiB, localhost", firstMs: timings[0], warmMs: timings.slice(1), medianWarmMs: Number(((sortedWarm[2] + sortedWarm[3]) / 2).toFixed(3)) };
      const phase = process.argv[2];
      assert.ok(["before", "after"].includes(phase));
      fs.writeFileSync(path.join(__dirname, `watchtime-${phase}.json`), JSON.stringify(output, null, 2) + "\n");
      console.log(JSON.stringify(output));
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await prisma.$disconnect(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
