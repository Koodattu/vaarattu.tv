require("ts-node/register");
const assert = require("node:assert/strict");
const { test } = require("node:test");

test("viewer lookup retains full-population ranks and bounded deterministic pages", { skip: !process.env.VOD_TEST_DATABASE_URL }, async t => {
  assert.equal(process.env.VOD_TEST_DATABASE_URL, "postgresql://postgres@127.0.0.1:35489/postgres");
  process.env.DATABASE_URL = process.env.VOD_TEST_DATABASE_URL;
  const prismaModule = require("../src/prismaClient");
  const prisma = prismaModule.default;
  const { LeaderboardService } = require("../src/services/leaderboard.service");
  const service = new LeaderboardService();
  t.after(() => prisma.$disconnect());
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2030-10-10T12:00:00Z") });
  const rollback = new Error("Rollback synthetic ranking fixture");
  try {
    await prisma.$transaction(async db => {
      prismaModule.default = db;
      try {
        // Existing integration suites use rolled-back fixtures; this suite requires
        // the documented fresh disposable DB, never browser/production records.
        assert.equal(await db.viewerProfile.count(), 0);
        const users = [];
        for (const [index, name] of ["Leader", "Twin", "Twin %_literal", "No activity"].entries()) {
          users.push(await db.user.create({ data: {
            twitchId: `rank-${index}`, login: `rank-${index}`, displayName: name,
            ...(index < 3 ? { viewerProfile: { create: { totalMessages: [4, 2, 2][index], totalWatchTime: [120, 60, 60][index], totalPointsSpent: [200, 100, 100][index], totalRedemptions: [4, 2, 2][index] } } } : {}),
          } }));
        }
        const timestamp = new Date("2030-10-09T12:00:00Z");
        const stream = await db.stream.create({ data: { twitchId: "rank-stream", startTime: timestamp } });
        const reward = await db.channelReward.create({ data: { twitchId: "rank-reward", title: "Synthetic reward", cost: 50, isEnabled: true } });
        for (const [index, user] of users.slice(0, 3).entries()) {
          const count = index === 0 ? 4 : 2;
          for (let n = 0; n < count; n++) {
            await db.message.create({ data: { twitchId: `rank-message-${index}-${n}`, userId: user.id, streamId: stream.id, content: "Synthetic", timestamp } });
            await db.redemption.create({ data: { twitchId: `rank-redemption-${index}-${n}`, userId: user.id, streamId: stream.id, rewardId: reward.twitchId, timestamp } });
          }
          await db.viewSession.create({ data: { userId: user.id, streamId: stream.id, sessionStart: timestamp, sessionEnd: new Date(timestamp.getTime() + count * 30 * 60000) } });
          await db.subscriptionGift.create({ data: { userId: user.id, amount: count, tier: "1000", timestamp } });
          await db.cheer.create({ data: { userId: user.id, bits: count * 100, timestamp } });
        }
        await db.subscriptionGift.create({ data: { amount: 1000, tier: "1000", isAnonymous: true, timestamp } });
        await db.cheer.create({ data: { bits: 100000, isAnonymous: true, timestamp } });
        // Old events must not change the period population or positions.
        await db.message.create({ data: { twitchId: "rank-old", userId: users[3].id, streamId: stream.id, content: "Old", timestamp: new Date("2030-01-01T12:00:00Z") } });
        const methods = [
          ...["messages", "watchtime", "points"].map(metric => ({
            label: metric, key: "users", field: { messages: "totalMessages", watchtime: "totalWatchTime", points: "totalPointsSpent" }[metric], expected: { messages: 2, watchtime: 60, points: 100 }[metric],
            run: (page, limit, period, search) => service.getTopUsers(page, limit, metric, period, search),
          })),
          { label: "gifts", key: "gifters", field: "totalGiftedSubs", expected: 2, run: (...args) => service.getTopSubscriptionGifters(...args) },
          { label: "cheers", key: "cheers", field: "totalBits", expected: 200, run: (...args) => service.getTopCheers(...args) },
        ];
        for (const method of methods) for (const period of ["all", "week"]) {
          await t.test(`${method.label}/${period}: filtering does not renumber ties; literal search, pages and counts agree`, async () => {
            const found = await method.run(1, 1, period, "tWiN");
            assert.equal(found.total, 2);
            assert.deepEqual(found[method.key].map(row => [row.id, row.rank, row[method.field]]), [[users[1].id, 2, method.expected]]);
            const next = await method.run(2, 1, period, "Twin");
            assert.deepEqual(next[method.key].map(row => [row.id, row.rank]), [[users[2].id, 3]]);
            const empty = await method.run(3, 1, period, "Twin");
            assert.equal(empty.total, 2);
            assert.deepEqual(empty[method.key], []);
            const literal = await method.run(1, 25, period, "%_");
            assert.deepEqual(literal[method.key].map(row => [row.id, row.rank]), [[users[2].id, 3]]);
            assert.equal(literal.total, 1);
            assert.deepEqual((await method.run(1, 25, period, "rank-1"))[method.key].map(row => row.id), [users[1].id]);
            const missing = await method.run(1, 25, period, "absent-viewer");
            assert.equal(missing.total, 0);
            assert.deepEqual(missing[method.key], []);
          });
        }
      } finally { prismaModule.default = prisma; }
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
});
