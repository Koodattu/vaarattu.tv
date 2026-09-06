require("ts-node/register");
const assert = require("node:assert/strict");
const { test } = require("node:test");

test("activity preserves message minutes and totals regardless of PostgreSQL timezone", { skip: !process.env.VOD_TEST_DATABASE_URL }, async (t) => {
  assert.equal(process.env.VOD_TEST_DATABASE_URL, "postgresql://postgres@127.0.0.1:55489/postgres");
  process.env.DATABASE_URL = process.env.VOD_TEST_DATABASE_URL;
  const prismaModule = require("../src/prismaClient");
  const prisma = prismaModule.default;
  const { StreamService } = require("../src/services/stream.service");
  t.after(() => prisma.$disconnect());

  for (const date of ["2026-08-24T15:52:48Z", "2026-01-24T15:52:48Z"]) {
    for (const timezone of ["UTC", "Europe/Helsinki", "America/New_York"]) {
      await t.test(`${date} in ${timezone}`, async () => {
        const rollback = new Error("Rollback test fixtures");
        await assert.rejects(prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT set_config('TimeZone', ${timezone}, true)`;
          const startTime = new Date(date);
          const at = (minutes) => new Date(startTime.getTime() + minutes * 60000);
          const user = await tx.user.create({ data: { twitchId: "activity-test-user", login: "activity-test-user", displayName: "Test Viewer" } });
          const stream = await tx.stream.create({ data: { twitchId: "activity-test-stream", startTime, endTime: at(240.5) } });
          const offsets = [-1, 0, 0.5, 59, 60, 120, 180, 239, 240.25, 240.5, 241];
          await tx.message.createMany({ data: offsets.map((offset, index) => ({
            twitchId: `activity-test-message-${index}`, streamId: stream.id, userId: user.id,
            content: "Test message", timestamp: at(offset),
          })) });
          prismaModule.default = tx;
          try {
            const activity = await new StreamService().getStreamActivity(stream.id);
            assert.deepEqual(activity.points.map((point) => point.messagesPerMinute).filter((count) => count > 0), [2, 1, 1, 1, 1, 1, 2]);
            for (const minute of [0, 59, 60, 120, 180, 239, 240]) {
              assert.equal(activity.points[minute].activeChatters, 1, `chatters in minute ${minute}`);
            }
            const messages = activity.points.reduce((sum, point) => sum + point.messagesPerMinute * (Date.parse(point.endTime) - Date.parse(point.time)) / 60000, 0);
            assert.equal(messages, 8, "every message within the stream belongs to the chart");
            await tx.stream.update({ where: { id: stream.id }, data: { endTime: null } });
            const ongoing = await new StreamService().getStreamActivity(stream.id);
            const ongoingMessages = ongoing.points.reduce((sum, point) => sum + point.messagesPerMinute * (Date.parse(point.endTime) - Date.parse(point.time)) / 60000, 0);
            assert.ok(Math.abs(ongoingMessages - 10) < 0.000001, "ongoing streams preserve all messages since their start");
          } finally {
            prismaModule.default = prisma;
          }
          throw rollback;
        }), (error) => error === rollback);
      });
    }
  }
});
