const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const prismaModule = require("../src/prismaClient");
const originalPrisma = prismaModule.default;
const unexpectedQuery = () => { throw new Error("Unexpected database query"); };
const prisma = {
  stream: { findMany: unexpectedQuery, update: unexpectedQuery, updateMany: unexpectedQuery, findUnique: unexpectedQuery },
  streamViewerSample: { createMany: unexpectedQuery },
};
prismaModule.default = prisma;
after(() => { prismaModule.default = originalPrisma; });
const twitchApi = require("../src/twitch/api/twitchApi");
const { syncStreamVideoIds, recordStreamViewerSample } = require("../src/services/streamMetadata.service");

test("links archives by exact stream ID, keeps the newest match, and skips unchanged records", async (t) => {
  t.mock.method(twitchApi, "getTwitchApiClientWithStreamer", async () => ({ videos: {
    getVideosByUserPaginated: (id, options) => {
      assert.equal(id, "channel-1");
      assert.deepEqual(options, { type: "archive", orderBy: "time" });
      return { getAll: async () => [
        { id: "video-new", streamId: "stream-1", getThumbnailUrl: (width, height) => `https://static-cdn.jtvnw.net/new-${width}x${height}.jpg` },
        { id: "video-old", streamId: "stream-1" },
        { id: "video-2", streamId: "stream-2", getThumbnailUrl: () => "saved-thumbnail" },
        { id: "highlight", streamId: null },
      ] };
    },
  } }));
  t.mock.method(prisma.stream, "findMany", async (query) => {
    assert.deepEqual(query.where.twitchId.in, ["stream-1", "stream-2"]);
    return [{ id: 1, twitchId: "stream-1", twitchVideoId: null, thumbnailUrl: "live-preview" }, { id: 2, twitchId: "stream-2", twitchVideoId: "video-2", thumbnailUrl: "saved-thumbnail" }];
  });
  const update = t.mock.method(prisma.stream, "update", async () => ({}));
  const availability = t.mock.method(prisma.stream, "updateMany", async () => ({ count: 1 }));
  await syncStreamVideoIds("channel-1");
  assert.equal(update.mock.callCount(), 1);
  assert.deepEqual(update.mock.calls[0].arguments[0], { where: { id: 1 }, data: { twitchVideoId: "video-new", thumbnailUrl: "https://static-cdn.jtvnw.net/new-640x360.jpg" } });
  assert.equal(availability.mock.callCount(), 2);
  assert.equal(availability.mock.calls[0].arguments[0].data.twitchVideoAvailable, true);
  assert.deepEqual(availability.mock.calls[1].arguments[0].where.twitchVideoId.notIn, ["video-new", "video-old", "video-2", "highlight"]);
  assert.equal(availability.mock.calls[1].arguments[0].data.twitchVideoAvailable, false);
});

test("empty or failed archive responses do not erase saved IDs, and later runs retry", async (t) => {
  let response = [];
  let fail = false;
  const fetch = t.mock.fn(async () => {
    if (fail) throw new Error("Twitch unavailable");
    return response;
  });
  t.mock.method(twitchApi, "getTwitchApiClientWithStreamer", async () => ({ videos: {
    getVideosByUserPaginated: () => ({ getAll: fetch }),
  } }));
  const read = t.mock.method(prisma.stream, "findMany", async () => [{ id: 1, twitchId: "stream-1", twitchVideoId: null }]);
  const update = t.mock.method(prisma.stream, "update", async () => ({}));
  const availability = t.mock.method(prisma.stream, "updateMany", async () => ({ count: 1 }));
  await syncStreamVideoIds("channel-1");
  assert.equal(read.mock.callCount(), 0);
  fail = true;
  await assert.rejects(syncStreamVideoIds("channel-1"), /Twitch unavailable/);
  assert.equal(update.mock.callCount(), 0);
  assert.equal(availability.mock.callCount(), 2, "failed API requests must not change availability");
  fail = false;
  response = [{ id: "video-1", streamId: "stream-1", getThumbnailUrl: () => "archive-thumbnail" }];
  await syncStreamVideoIds("channel-1");
  assert.equal(update.mock.callCount(), 1);
});

test("refreshes thumbnails for already linked archives and preserves them when Twitch returns no image", async (t) => {
  let thumbnail = "new-thumbnail";
  t.mock.method(twitchApi, "getTwitchApiClientWithStreamer", async () => ({ videos: {
    getVideosByUserPaginated: () => ({ getAll: async () => [{ id: "video-1", streamId: "stream-1", getThumbnailUrl: () => thumbnail }] }),
  } }));
  t.mock.method(prisma.stream, "findMany", async () => [{ id: 1, twitchId: "stream-1", twitchVideoId: "video-1", thumbnailUrl: "old-thumbnail" }]);
  const update = t.mock.method(prisma.stream, "update", async () => ({}));
  t.mock.method(prisma.stream, "updateMany", async () => ({ count: 1 }));
  await syncStreamVideoIds("channel-1");
  assert.equal(update.mock.calls[0].arguments[0].data.thumbnailUrl, "new-thumbnail");
  thumbnail = "";
  await syncStreamVideoIds("channel-1");
  assert.equal(update.mock.callCount(), 1, "an empty thumbnail must not erase the saved image");
});

test("records the actual audience, including zero, against the matching stream", async (t) => {
  const timestamp = new Date("2026-09-06T12:01:23Z");
  t.mock.method(prisma.stream, "findUnique", async (query) => {
    assert.deepEqual(query.where, { twitchId: "stream-1" });
    return { id: 7, startTime: new Date("2026-09-06T12:00:00Z"), endTime: null };
  });
  const create = t.mock.method(prisma.streamViewerSample, "createMany", async () => ({ count: 1 }));
  await recordStreamViewerSample({ id: "stream-1", viewers: 0 }, timestamp);
  assert.deepEqual(create.mock.calls[0].arguments[0], {
    data: [{ streamId: 7, timestamp, viewerCount: 0 }], skipDuplicates: true,
  });
});

test("does not attach samples to unknown streams or outside their lifetime", async (t) => {
  const timestamp = new Date("2026-09-06T12:01:00Z");
  const create = t.mock.method(prisma.streamViewerSample, "createMany", async () => ({ count: 1 }));
  for (const stored of [null,
    { id: 7, startTime: new Date("2026-09-06T12:02:00Z"), endTime: null },
    { id: 7, startTime: new Date("2026-09-06T12:00:00Z"), endTime: timestamp },
  ]) {
    const read = t.mock.method(prisma.stream, "findUnique", async () => stored);
    await recordStreamViewerSample({ id: "stream-1", viewers: 100 }, timestamp);
    read.mock.restore();
  }
  assert.equal(create.mock.callCount(), 0);
});
