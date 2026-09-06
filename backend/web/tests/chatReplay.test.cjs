require("ts-node/register");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const prismaModule = require("../src/prismaClient");
const unexpected = () => { throw new Error("Unexpected database query"); };
const prisma = { stream: { findUnique: unexpected }, message: { findMany: unexpected } };
prismaModule.default = prisma;
const { parseReplayQuery, getChatReplay } = require("../src/services/chatReplay.service");
const { twitchRecordingAvailable } = require("../src/utils/recordingPlayback");

test("bounds chat windows and validates cursors within the requested window", () => {
  assert.deepEqual(parseReplayQuery({ start: "30", after: "30123:8" }), { start: 30, after: { milliseconds: 30123, id: 8 } });
  for (const query of [{}, { start: "-1" }, { start: "1.5" }, { start: "30x" }, { start: "30", after: "29999:8" }, { start: "30", after: "60000:8" }, { start: "0", after: "0:0" }, { start: ["0"] }]) assert.equal(parseReplayQuery(query), null);
});

test("chat pagination preserves timestamp ties and excludes messages outside the stream", async (t) => {
  const start = new Date("2026-07-01T12:00:00Z");
  t.mock.method(prisma.stream, "findUnique", async () => ({ startTime: start, endTime: new Date(start.getTime() + 20000) }));
  const read = t.mock.method(prisma.message, "findMany", async () => Array.from({ length: 501 }, (_, i) => ({ id: i + 1, timestamp: new Date(start.getTime() + 5000), content: "message", user: { login: "viewer", displayName: "Viewer" } })));
  const first = await getChatReplay(2, { start: 0, after: null });
  assert.equal(first.messages.length, 500);
  assert.equal(first.nextCursor, "5000:500");
  assert.equal(first.messages[0].offsetSeconds, 5);
  assert.equal(read.mock.calls[0].arguments[0].where.timestamp.lt.getTime(), start.getTime() + 20000);
  await getChatReplay(2, parseReplayQuery({ start: "0", after: first.nextCursor }));
  const query = read.mock.calls[1].arguments[0];
  assert.equal(query.where.streamId, 2);
  assert.deepEqual(query.orderBy, [{ timestamp: "asc" }, { id: "asc" }]);
  assert.deepEqual(query.where.OR[1], { timestamp: new Date(start.getTime() + 5000), id: { gt: 500 } });
});

test("unknown streams do not query messages", async (t) => {
  t.mock.method(prisma.stream, "findUnique", async () => null);
  const read = t.mock.method(prisma.message, "findMany", async () => []);
  assert.equal(await getChatReplay(10, { start: 0, after: null }), null);
  assert.equal(read.mock.callCount(), 0);
});

test("Twitch preference respects confirmed deletion, expiry and fresh availability checks", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  const stream = { startTime: new Date("2026-07-01T12:00:00Z"), twitchVideoId: "123", twitchVideoAvailable: null, twitchVideoCheckedAt: null };
  assert.equal(twitchRecordingAvailable(stream, now), false);
  assert.equal(twitchRecordingAvailable({ ...stream, twitchVideoAvailable: true, twitchVideoCheckedAt: now }, now), true);
  assert.equal(twitchRecordingAvailable({ ...stream, twitchVideoAvailable: true, twitchVideoCheckedAt: stream.startTime }, now), false);
  assert.equal(twitchRecordingAvailable({ ...stream, startTime: now }, now), true);
  assert.equal(twitchRecordingAvailable({ ...stream, startTime: now, twitchVideoAvailable: false }, now), false);
  assert.equal(twitchRecordingAvailable({ ...stream, startTime: now, twitchVideoId: null }, now), false);
});
