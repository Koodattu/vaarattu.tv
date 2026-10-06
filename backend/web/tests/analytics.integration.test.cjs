require("ts-node/register");
const assert = require("node:assert/strict");
const { test } = require("node:test");

test("analytics use filtered populations and consistent viewer counts", { skip: !process.env.VOD_TEST_DATABASE_URL }, async (t) => {
  assert.equal(process.env.VOD_TEST_DATABASE_URL, "postgresql://postgres@127.0.0.1:35489/postgres");
  process.env.DATABASE_URL = process.env.VOD_TEST_DATABASE_URL;
  const prismaModule = require("../src/prismaClient");
  const prisma = prismaModule.default;
  const { LeaderboardService } = require("../src/services/leaderboard.service");
  t.after(() => prisma.$disconnect());

  async function rollbackFixture(run) {
    const rollback = new Error("Rollback synthetic fixture");
    try {
      await prisma.$transaction(async tx => {
        prismaModule.default = tx;
        try { await run(tx); } finally { prismaModule.default = prisma; }
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
  }

  await t.test("platform is filtered before paging; totals exclude unused emotes; ties are stable", () => rollbackFixture(async db => {
    const user = await db.user.create({ data: { twitchId: "analytics-viewer", login: "analytics-viewer", displayName: "Synthetic viewer" } });
    const create = (name, platform, count) => db.emote.create({ data: { name, platform, emoteId: name, ...(count ? { emoteUsages: { create: { userId: user.id, count } } } : {}) } });
    await create("analytics-twitch", "twitch", 900);
    const first = await create("analytics-one", "bttv", 50);
    const second = await create("analytics-two", "bttv", 50);
    await create("analytics-unused", "bttv", 0);
    const service = new LeaderboardService();
    const page1 = await service.getTopEmotes(1, 1, "all", "bttv");
    const page2 = await service.getTopEmotes(2, 1, "all", "bttv");
    assert.deepEqual(page1.emotes.map(row => [row.id, row.totalUsage]), [[first.id, 50]]);
    assert.deepEqual(page2.emotes.map(row => row.id), [second.id]);
    assert.equal(page1.total, 2);
    assert.equal((await service.getTopEmotes(3, 1, "all", "bttv")).emotes.length, 0);
  }));

  await t.test("period watchtime includes only the overlapping portion of completed sessions", async t => {
    t.mock.timers.enable({ apis: ["Date"], now: new Date("2030-10-10T12:00:00Z") });
    await rollbackFixture(async db => {
      const first = await db.user.create({ data: { twitchId: "time-first", login: "time-first", displayName: "First" } });
      const second = await db.user.create({ data: { twitchId: "time-second", login: "time-second", displayName: "Second" } });
      const stream = await db.stream.create({ data: { twitchId: "time-stream", startTime: new Date("2030-10-03T11:00:00Z"), endTime: new Date("2030-10-10T12:00:00Z") } });
      const session = (userId, start, end) => db.viewSession.create({ data: { userId, streamId: stream.id, sessionStart: new Date(start), sessionEnd: end ? new Date(end) : null } });
      await session(first.id, "2030-10-03T11:30:00Z", "2030-10-03T12:30:00Z"); // 30 minutes in period
      await session(first.id, "2030-10-04T12:00:00Z", "2030-10-04T12:15:00Z"); // 15 minutes
      await session(first.id, "2030-10-02T12:00:00Z", "2030-10-03T12:00:00Z"); // ends at boundary
      await session(second.id, "2030-10-04T12:00:00Z", "2030-10-04T12:40:00Z");
      await session(second.id, "2030-10-10T11:00:00Z", null); // ongoing remains outside completed totals
      const service = new LeaderboardService();
      const result = await service.getTopUsers(1, 1, "watchtime", "week");
      assert.deepEqual(result.users.map(user => [user.id, user.totalWatchTime]), [[first.id, 45]]);
      assert.equal(result.total, 2);
      assert.deepEqual((await service.getTopUsers(2, 1, "watchtime", "week")).users.map(user => [user.id, user.totalWatchTime]), [[second.id, 40]]);
      assert.equal((await service.getTopUsers(3, 1, "watchtime", "week")).total, 2);
    });
  });

  await t.test("stream list, detail and timeline count people once across repeated and overlapping sessions", () => rollbackFixture(async db => {
    const first = await db.user.create({ data: { twitchId: "audience-first", login: "audience-first", displayName: "First" } });
    const second = await db.user.create({ data: { twitchId: "audience-second", login: "audience-second", displayName: "Second" } });
    const startTime = new Date("2030-01-01T12:00:00Z");
    const at = minute => new Date(startTime.getTime() + minute * 60000);
    const stream = await db.stream.create({ data: { twitchId: "audience-stream", startTime, endTime: at(4) } });
    await db.viewSession.createMany({ data: [[first.id, 0, 3], [first.id, 1, 2], [first.id, 3, 4], [second.id, 1, 2]].map(([userId, from, to]) => ({ userId, streamId: stream.id, sessionStart: at(from), sessionEnd: at(to) })) });
    const { StreamService } = require("../src/services/stream.service");
    const service = new StreamService();
    assert.equal((await service.getStream(stream.id)).uniqueViewers, 2);
    assert.equal((await service.getStreams(1, 100)).streams.find(row => row.id === stream.id).uniqueViewers, 2);
    const timeline = await service.getStreamTimeline(stream.id);
    assert.equal(timeline.stats.uniqueViewers, 2);
    assert.equal(timeline.stats.peakViewers, 2);
    assert.equal(timeline.viewerSessions.length, 4, "preserve individual sessions in the timeline");
  }));
});
