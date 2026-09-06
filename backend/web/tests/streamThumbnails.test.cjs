require("ts-node/register");
const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const prismaModule = require("../src/prismaClient");
const originalPrisma = prismaModule.default;
const prisma = { stream: { findMany: async () => [], count: async () => 0 } };
prismaModule.default = prisma;
after(() => { prismaModule.default = originalPrisma; });
const { StreamService } = require("../src/services/stream.service");

test("VOD list prefers a linked YouTube image and falls back to Twitch or no image", async (t) => {
  t.mock.method(prisma.stream, "findMany", async (query) => {
    assert.deepEqual(query.select.youtubeVideos, {
      where: { available: true, thumbnailUrl: { not: null } },
      select: { thumbnailUrl: true }, orderBy: { position: "asc" }, take: 1,
    });
    return [
      { thumbnailUrl: "twitch.jpg", youtubeVideos: [{ thumbnailUrl: "youtube.jpg" }] },
      { thumbnailUrl: "twitch.jpg", youtubeVideos: [] },
      { thumbnailUrl: null, youtubeVideos: [] },
    ].map((images, index) => ({
      id: index + 1, twitchId: String(index), startTime: new Date("2026-09-06T12:00:00Z"), endTime: null,
      _count: { messages: 0, redemptions: 0, viewSessions: 0 }, segments: [], ...images,
    }));
  });
  const { streams } = await new StreamService().getStreams(1, 12);
  assert.deepEqual(streams.map((stream) => stream.thumbnailUrl), ["youtube.jpg", "twitch.jpg", null]);
});
