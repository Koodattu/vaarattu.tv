require("ts-node/register");
const assert = require("node:assert/strict");
const { test } = require("node:test");

test("Twitch clips become a searchable public catalog", { skip: !process.env.VOD_TEST_DATABASE_URL }, async t => {
  assert.equal(process.env.VOD_TEST_DATABASE_URL, "postgresql://postgres@127.0.0.1:55489/postgres");
  // One collector connection lets the regression exercise real session timezones.
  process.env.DATABASE_URL = `${process.env.VOD_TEST_DATABASE_URL}?connection_limit=1`;
  const auth = require("../../twitch/dist/twitch/auth/authProviders");
  const twitch = require("../../twitch/dist/twitch/api/twitchApi");
  const { syncClips } = require("../../twitch/dist/services/clip.service");
  const prisma = require("../src/prismaClient").default;
  const collectorPrisma = require("../../twitch/dist/prismaClient").default;
  const clip = (id, title, views, extra = {}) => ({
    id, title, views, broadcasterId: "clips-test-owner", creatorDisplayName: "Clipper One",
    creationDate: new Date("2026-10-01T12:00:00Z"), duration: 24.5,
    thumbnailUrl: "https://clips-media-assets.twitch.tv/test-preview.jpg", gameId: "clips-test-game",
    videoId: "", vodOffset: null, isFeatured: false, ...extra,
  });
  let pages = [
    { data: [clip("ClipsTestA", "One more cave expedition", 40)], cursor: "next" },
    { data: [clip("ClipsTestB", "A perfect landing", 90, { isFeatured: true })] },
  ];
  const api = {
    clips: { getClipsForBroadcaster: async (_id, filter) => pages[filter.after ? 1 : 0], getClipsByIds: async () => [] },
    games: { getGamesByIds: async () => [{ id: "clips-test-game", name: "Deep Rock Galactic" }] },
  };
  t.mock.method(auth, "getUserId", () => "clips-test-owner");
  t.mock.method(twitch, "getTwitchApiClientWithStreamer", async () => api);
  const app = require("express")();
  app.use("/api/clips", require("../src/routes/clip.routes").default);
  app.use(require("../src/middleware/errorHandler").errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/clips`;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await prisma.clip.deleteMany({ where: { broadcasterId: "clips-test-owner" } });
    await prisma.$disconnect(); await collectorPrisma.$disconnect();
  });
  const read = async path => {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200);
    return response.json();
  };
  await t.test("preserves UTC creation and refresh instants across database timezones and DST", async () => {
    const dates = ["2026-01-01T12:00:00.123Z", "2026-07-01T12:00:00.456Z"];
    try {
      for (const timezone of ["UTC", "Europe/Helsinki", "America/New_York"]) {
        await collectorPrisma.$queryRaw`SELECT set_config('TimeZone', ${timezone}, false)`;
        pages.forEach((page, index) => { page.data[0].creationDate = new Date(dates[index]); });
        const before = Date.now();
        await syncClips();
        const after = Date.now();
        for (const [index, id] of ["ClipsTestA", "ClipsTestB"].entries()) {
          const saved = (await read(`/${id}`)).data;
          assert.equal(saved.createdAt, dates[index], `${id} in ${timezone}`);
          assert.ok(Date.parse(saved.checkedAt) >= before && Date.parse(saved.checkedAt) <= after, `refresh time in ${timezone}`);
        }
      }
    } finally {
      await collectorPrisma.$queryRaw`SELECT set_config('TimeZone', 'UTC', false)`;
      pages.forEach(page => { page.data[0].creationDate = new Date("2026-10-01T12:00:00Z"); });
    }
  });
  await t.test("imports every page and exposes exact totals, categories and stable popular order", async () => {
    await syncClips();
    const result = await read("?limit=1&q=deep%20rock");
    assert.equal(result.pagination.total, 2);
    assert.equal(result.pagination.totalPages, 2);
    assert.equal(result.data[0].id, "ClipsTestB");
    assert.equal(result.data[0].viewCount, 90);
    assert.equal(result.data[0].durationSeconds, 24.5);
    assert.equal(result.data[0].gameName, "Deep Rock Galactic");
    const second = await read("?limit=1&q=deep%20rock&page=2");
    assert.equal(second.data[0].id, "ClipsTestA");
    assert.equal((await read("?q=cave")).pagination.total, 1);
    assert.equal((await read("?q=Clipper%20One&featured=true")).pagination.total, 1);
  });
  await t.test("refreshes existing clips and preserves the complete snapshot on malformed metadata or a failed later page", async () => {
    pages[0].data[0].views = 120;
    await syncClips();
    assert.equal((await read("?limit=1")).data[0].viewCount, 120);
    pages[0].data[0].views = 500;
    const valid = pages[1];
    pages[1] = { data: [clip(undefined, "Malformed clip", 1)] };
    await assert.rejects(syncClips(), /invalid clip metadata/);
    assert.equal((await read("/ClipsTestA")).data.viewCount, 120);
    pages[1] = valid;
    const original = api.clips.getClipsForBroadcaster;
    api.clips.getClipsForBroadcaster = async (id, filter) => {
      if (filter.after) throw new Error("Upstream unavailable");
      return original(id, filter);
    };
    await assert.rejects(syncClips(), /Upstream unavailable/);
    assert.equal((await read("/ClipsTestA")).data.viewCount, 120);
    assert.equal((await read("")).pagination.total, 2);
    api.clips.getClipsForBroadcaster = original;
  });
  await t.test("confirms missing ranked results by ID and keeps unavailable permalinks", async () => {
    pages = [{ data: [] }];
    api.clips.getClipsByIds = async ids => ids.includes("ClipsTestA") ? [clip("ClipsTestA", "Still here", 130)] : [];
    await syncClips();
    assert.equal((await read("")).pagination.total, 1);
    assert.equal((await read("/ClipsTestB")).data.available, false);
    assert.equal((await read("/ClipsTestA")).data.available, true);
    pages = [{ data: [clip("ClipsTestB", "Back again", 90)] }];
    await syncClips();
    assert.equal((await read("/ClipsTestB")).data.available, true);
    assert.equal((await read("")).pagination.total, 2);
  });
  await t.test("splits capped windows, deduplicates boundaries, and rejects repeated cursors", async () => {
    const original = api.clips.getClipsForBroadcaster;
    const dense = Array.from({ length: 900 }, (_, i) => clip(`ClipsDense${i}`, `Busy day ${i}`, i));
    let firstEnd;
    api.clips.getClipsForBroadcaster = async (_id, filter) => {
      firstEnd ??= filter.endDate;
      if (filter.startDate === new Date(0).toISOString() && filter.endDate === firstEnd) {
        const offset = Number(filter.after || 0);
        return { data: dense.slice(offset, offset + 100), cursor: offset < 800 ? String(offset + 100) : undefined };
      }
      return { data: filter.startDate === new Date(0).toISOString() ? dense.slice(0, 500) : dense.slice(499) };
    };
    await syncClips();
    assert.equal((await read("?q=Busy%20day")).pagination.total, 900);
    api.clips.getClipsForBroadcaster = async () => ({ data: [], cursor: "same" });
    await assert.rejects(syncClips(), /repeated a clips cursor/);
    assert.equal((await read("?q=Busy%20day")).pagination.total, 900);
    api.clips.getClipsForBroadcaster = original;
    await prisma.clip.deleteMany({ where: { id: { startsWith: "ClipsDense" }, broadcasterId: "clips-test-owner" } });
  });
  await t.test("validates public queries and links a clip only to its exact source recording", async () => {
    const stream = await prisma.stream.create({ data: { twitchId: "clips-source-test", twitchVideoId: "987654321", startTime: new Date() } });
    try {
      pages = [{ data: [clip("ClipsTestA", "100%_precision", 130, { videoId: "987654321", vodOffset: 45, creationDate: new Date() })] }];
      api.clips.getClipsByIds = async () => [];
      await syncClips();
      const detail = (await read("/ClipsTestA")).data;
      assert.equal(detail.streamId, stream.id);
      assert.equal(detail.vodOffsetSeconds, 45);
      assert.equal((await read("?q=%25_")).pagination.total, 1);
      assert.equal((await read("?sort=newest&period=7d")).pagination.total, 1);
      assert.equal((await read("?page=99")).data.length, 0);
      for (const query of ["?sort=invalid", "?period=today", "?featured=yes", "?q=a&q=b", "?page=0", `?q=${"x".repeat(301)}`]) {
        assert.equal((await fetch(`${base}${query}`)).status, 400, query);
      }
      assert.equal((await fetch(`${base}/UnknownClip`)).status, 404);
      assert.equal((await fetch(`${base}/invalid.id`)).status, 400);
    } finally { await prisma.stream.delete({ where: { id: stream.id } }); }
  });
  await t.test("rolls back earlier write batches if the database rejects a later batch", async () => {
    const before = (await read("/ClipsTestA")).data;
    await prisma.$executeRawUnsafe(`ALTER TABLE "Clip" ADD CONSTRAINT "clips_test_reject" CHECK ("title" <> 'Reject this transaction')`);
    try {
      pages = [{ data: [clip("ClipsTestA", "Changed before failure", 999),
        ...Array.from({ length: 100 }, (_, i) => clip(`ClipsRollback${i}`, i === 99 ? "Reject this transaction" : "Temporary", i))] }];
      await assert.rejects(syncClips());
      assert.equal((await read("/ClipsTestA")).data.title, before.title);
      assert.equal((await read("/ClipsTestA")).data.viewCount, before.viewCount);
      assert.equal((await read("?q=Temporary")).pagination.total, 0);
    } finally { await prisma.$executeRawUnsafe(`ALTER TABLE "Clip" DROP CONSTRAINT "clips_test_reject"`); }
  });
});
