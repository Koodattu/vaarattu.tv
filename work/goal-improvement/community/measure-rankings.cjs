// Compares the starting revision with the new implementation on synthetic,
// rolled-back rows only. Run with the exact disposable test DB URL in the guide.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
assert.equal(process.env.VOD_TEST_DATABASE_URL, "postgresql://postgres@127.0.0.1:35489/postgres");
process.env.DATABASE_URL = process.env.VOD_TEST_DATABASE_URL;
const root = path.resolve(__dirname, "../../..");
require(path.join(root, "backend/web/node_modules/ts-node")).register({ project: path.join(root, "backend/web/tsconfig.json") });
const prismaModule = require(path.join(root, "backend/web/src/prismaClient"));
const prisma = prismaModule.default;
const baselinePath = path.join(root, "backend/web/tests/_community-benchmark-baseline.ts");
const baselineTypesPath = path.join(root, "backend/web/tests/_community-benchmark-types.ts");
assert.equal(fs.existsSync(baselinePath), false, "Never overwrite an existing file");
assert.equal(fs.existsSync(baselineTypesPath), false, "Never overwrite existing types");
const source = execFileSync("git", ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "show", "07c708b18f202fb2098422ae52db092fe1f8d70e:backend/web/src/services/leaderboard.service.ts"], { cwd: root, encoding: "utf8" })
  .replaceAll('"../prismaClient"', '"../src/prismaClient"').replaceAll('"../types/api.types"', '"./_community-benchmark-types"').replaceAll('"../utils/', '"../src/utils/');
fs.writeFileSync(baselineTypesPath, execFileSync("git", ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "show", "07c708b18f202fb2098422ae52db092fe1f8d70e:backend/web/src/types/api.types.ts"], { cwd: root }));
fs.writeFileSync(baselinePath, source);

async function main() {
  const Before = require(baselinePath).LeaderboardService;
  const After = require(path.join(root, "backend/web/src/services/leaderboard.service")).LeaderboardService;
  const rollback = new Error("Rollback benchmark fixtures");
  let evidence;
  try {
    await prisma.$transaction(async db => {
      prismaModule.default = db;
      try {
        const timestamp = new Date(Date.now() - 3600000);
        const stream = await db.stream.create({ data: { twitchId: "benchmark-ranking-stream", startTime: timestamp } });
        const reward = await db.channelReward.create({ data: { twitchId: "benchmark-ranking-reward", title: "Synthetic benchmark", cost: 100, isEnabled: true } });
        const redemptions = [], expected = [];
        for (let i = 0; i < 100; i++) {
          const user = await db.user.create({ data: { twitchId: `benchmark-ranking-${i}`, login: `benchmark-ranking-${i}`, displayName: `Benchmark Viewer ${i}` } });
          expected.unshift([user.id, (100 + i) * 100]);
          for (let n = 0; n < 100 + i; n++) redemptions.push({ twitchId: `benchmark-redemption-${i}-${n}`, userId: user.id, streamId: stream.id, rewardId: reward.twitchId, timestamp });
        }
        for (let offset = 0; offset < redemptions.length; offset += 1000) await db.redemption.createMany({ data: redemptions.slice(offset, offset + 1000) });
        const samples = { before: [], after: [], lookup: [] };
        for (let run = 0; run < 7; run++) {
          for (const [label, service] of [["before", new Before()], ["after", new After()]]) {
            const start = performance.now();
            const result = await service.getTopUsers(1, 25, "points", "week");
            samples[label].push(performance.now() - start);
            assert.deepEqual(result.users.map(row => [row.id, row.totalPointsSpent]), expected.slice(0, 25));
          }
          const start = performance.now();
          const lookup = await new After().getTopUsers(1, 25, "points", "week", "benchmark-ranking-0");
          samples.lookup.push(performance.now() - start);
          assert.equal(lookup.total, 1);
          assert.equal(lookup.users[0].rank, 100);
        }
        const median = values => { const sorted = values.slice(1).sort((a, b) => a - b); return (sorted[2] + sorted[3]) / 2; };
        evidence = { baseline: "07c708b18f202fb2098422ae52db092fe1f8d70e", environment: "Windows Node24, localhost PostgreSQL17.10 (1 CPU / 384 MiB); inserted pages already warm; not production latency", syntheticViewers: 100, syntheticRedemptions: redemptions.length, pageSize: 25, samplesMs: samples, medianAfterFirstSampleMs: Object.fromEntries(Object.entries(samples).map(([key, values]) => [key, median(values)])), verified: "Both versions return independently calculated top25 scores; lookup returns global rank100; transaction rolled back." };
      } finally { prismaModule.default = prisma; }
      throw rollback;
    }, { timeout: 60000 });
  } catch (error) { if (error !== rollback) throw error; }
  fs.writeFileSync(path.join(__dirname, "ranking-measurements.json"), JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { fs.unlinkSync(baselinePath); fs.unlinkSync(baselineTypesPath); await prisma.$disconnect(); });
