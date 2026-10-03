require("ts-node/register");
const assert = require("node:assert/strict");
const { test } = require("node:test");

test("stream archive filters through the public API", { skip: !process.env.VOD_TEST_DATABASE_URL }, async t => {
  assert.equal(process.env.VOD_TEST_DATABASE_URL, "postgresql://postgres@127.0.0.1:55489/postgres");
  process.env.DATABASE_URL = process.env.VOD_TEST_DATABASE_URL;
  const prisma = require("../src/prismaClient").default;
  const app = require("express")();
  app.use("/api/streams", require("../src/routes/stream.routes").default);
  app.use(require("../src/middleware/errorHandler").errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/streams`;
  const ids = [];
  const game = await prisma.game.create({ data: { twitchId: "archive-test-game", name: "ArchiveTest Luolaseikkailu" } });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await prisma.youTubeVideo.deleteMany({ where: { streamId: { in: ids } } });
    await prisma.streamSegment.deleteMany({ where: { streamId: { in: ids } } });
    await prisma.stream.deleteMany({ where: { id: { in: ids } } });
    await prisma.game.delete({ where: { id: game.id } });
    await prisma.$disconnect();
  });
  async function create(key, start, extra = {}) {
    const startTime = new Date(start);
    const row = await prisma.stream.create({ data: {
      twitchId: `archive-test-${key}`, startTime, endTime: new Date(startTime.getTime() + 3600000),
      segments: { create: { title: `ArchiveTest ${key}`, gameId: game.id, startTime } }, ...extra,
    } });
    ids.push(row.id);
    return row;
  }
  const cave = await create("Yöretki", "2026-03-28T22:00:00Z");
  await create("Other", "2026-03-29T21:00:00Z");
  const read = async query => {
    const response = await fetch(`${base}?${query}`);
    assert.equal(response.status, 200);
    return response.json();
  };
  await t.test("search matches any title or game before counting and paginating", async () => {
    const title = await read("q=y%C3%B6retki&limit=1");
    assert.deepEqual(title.data.map(row => row.id), [cave.id]);
    assert.equal(title.pagination.total, 1);
    const category = await read("q=Luolaseikkailu&limit=1");
    assert.equal(category.pagination.total, 2);
    assert.equal(category.pagination.totalPages, 2);
  });
  await t.test("inclusive Helsinki dates respect midnight and both daylight-saving transitions", async () => {
    await create("SpringBefore", "2026-03-28T21:59:59Z");
    const springEnd = await create("SpringEnd", "2026-03-29T20:59:59Z");
    const spring = await read("q=ArchiveTest&from=2026-03-29&to=2026-03-29");
    assert.deepEqual(spring.data.map(row => row.id), [springEnd.id, cave.id]);
    await create("AutumnBefore", "2026-10-24T20:59:59Z");
    const autumnStart = await create("AutumnStart", "2026-10-24T21:00:00Z");
    const autumnEnd = await create("AutumnEnd", "2026-10-25T21:59:59Z");
    await create("AutumnAfter", "2026-10-25T22:00:00Z");
    const autumn = await read("q=ArchiveTest&from=2026-10-25&to=2026-10-25");
    assert.deepEqual(autumn.data.map(row => row.id), [autumnEnd.id, autumnStart.id]);
  });
  await t.test("availability filtering and displayed sources agree with detail, even without a thumbnail", async () => {
    const youtube = await create("YouTube", "2025-01-01T12:00:00Z", { youtubeVideos: { create: { id: "archive-test-youtube", channelId: "synthetic", title: "ArchiveTest", durationSeconds: 3600, available: true, checkedAt: new Date(), position: 1 } } });
    const twitch = await create("Twitch", "2025-01-01T12:00:00Z", { twitchVideoId: "archive-test-twitch", twitchVideoAvailable: true, twitchVideoCheckedAt: new Date() });
    await create("Expired", "2025-01-01T12:00:00Z", { twitchVideoId: "archive-test-expired", twitchVideoAvailable: true, twitchVideoCheckedAt: new Date("2025-01-01T12:00:00Z") });
    await create("Unavailable", new Date().toISOString(), { twitchVideoId: "archive-test-unavailable", twitchVideoAvailable: false });
    const result = await read("q=ArchiveTest&recording=available&limit=1");
    assert.equal(result.pagination.total, 2);
    assert.deepEqual(result.data.map(row => row.id), [twitch.id]);
    assert.deepEqual(result.data[0].recordingSources, ["twitch"]);
    const second = await read("q=ArchiveTest&recording=available&limit=1&page=2");
    assert.deepEqual(second.data.map(row => row.id), [youtube.id]);
    assert.deepEqual(second.data[0].recordingSources, ["youtube"]);
    const combined = await read("q=ArchiveTest&recording=available&from=2026-03-29");
    assert.equal(combined.pagination.total, 0);
  });
  await t.test("invalid filters return 400, and SQL wildcard characters are literal search text", async () => {
    for (const query of ["from=2026-02-30", "to=bad", "from=2026-10-03&to=2026-10-02", "q=a&q=b", "recording=nope", "from=2026-01-01&from=2026-01-02"]) {
      assert.equal((await fetch(`${base}?${query}`)).status, 400, query);
    }
    assert.equal((await read("q=%25")).pagination.total, 0);
  });
});
