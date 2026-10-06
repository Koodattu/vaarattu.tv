require("ts-node/register");
const assert = require("node:assert/strict");
const { test } = require("node:test");

test("public API validates requests and serves viewers before analytics are generated", { skip: !process.env.VOD_TEST_DATABASE_URL }, async t => {
  assert.equal(process.env.VOD_TEST_DATABASE_URL, "postgresql://postgres@127.0.0.1:35489/postgres");
  process.env.DATABASE_URL = process.env.VOD_TEST_DATABASE_URL;
  const prisma = require("../src/prismaClient").default;
  const app = require("express")();
  for (const [prefix, route] of [["users", "user"], ["streams", "stream"], ["leaderboards", "leaderboard"], ["mod", "mod"]]) app.use(`/api/${prefix}`, require(`../src/routes/${route}.routes`).default);
  app.use(require("../src/middleware/errorHandler").errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  for (const suffix of [
    "/users/random?limit=-2", "/users?page=1x", "/users?limit=1.5", "/users?page=99999999999999999999",
    "/users?page=2147483647&limit=100", "/users?search=one&search=two", "/users/1x", "/users/2147483648/sessions",
    "/streams/1x", "/streams/0/timeline", "/leaderboards/users?sortBy=invalid", "/leaderboards/users?timeRange=invalid",
    "/leaderboards/emotes?platform=twitch&platform=bttv", "/leaderboards/rewards/1x",
    "/leaderboards/users?search=a&search=b", "/leaderboards/gifts?search=a&search=b", "/leaderboards/cheers?search=a&search=b",
    `/leaderboards/users?search=${"a".repeat(301)}`,
    "/mod/users/1/messages?streamId=invalid", "/mod/users/1/messages?search=a&search=b", "/mod/messages/search?search=%20%20",
    "/mod/messages/search?search=hello&streamId=invalid", "/mod/messages/search?search=hello&streamId=1x",
  ]) await t.test(`rejects ${suffix}`, async () => {
    const response = await fetch(base + suffix);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).success, false);
  });

  await t.test("a real viewer without an analytics row has an empty usable profile", async () => {
    const viewer = await prisma.user.create({ data: { twitchId: "api-new-viewer", login: "api-new-viewer", displayName: "New Viewer" } });
    try {
      const response = await fetch(`${base}/users/login/API-NEW-VIEWER`);
      assert.equal(response.status, 200);
      const { data } = await response.json();
      assert.equal(data.id, viewer.id);
      assert.equal(data.totalMessages, 0);
      assert.equal(data.aiSummary, null);
      assert.deepEqual(data.topEmotes, []);
      assert.equal((await fetch(`${base}/users/login/not-a-real-viewer`)).status, 404);
    } finally { await prisma.user.delete({ where: { id: viewer.id } }); }
  });

  await t.test("message pages preserve equal timestamps without duplicating or losing rows", async () => {
    const viewer = await prisma.user.create({ data: { twitchId: "api-history-viewer", login: "api-history-viewer", displayName: "History Viewer" } });
    const stream = await prisma.stream.create({ data: { twitchId: "api-history-stream", startTime: new Date("2026-01-01T12:00:00Z") } });
    try {
      const ids = [];
      for (let i = 0; i < 5; i++) ids.push((await prisma.message.create({ data: { twitchId: `api-tie-${i}`, userId: viewer.id, streamId: stream.id, content: `Tie ${i}`, timestamp: new Date("2026-01-01T12:01:00Z") } })).id);
      const observed = [];
      for (const page of [1, 2, 3]) {
        const response = await fetch(`${base}/mod/users/${viewer.id}/messages?page=${page}&limit=2`);
        const body = await response.json();
        assert.equal(body.pagination.totalPages, 3);
        observed.push(...body.data.map(row => row.id));
      }
      assert.deepEqual(observed, [ids[4], ids[3], ids[2], ids[1], ids[0]]);
      const filtered = await (await fetch(`${base}/mod/users/${viewer.id}/messages?search=Tie%204`)).json();
      assert.deepEqual(filtered.data.map(row => row.id), [ids[4]]);
    } finally {
      await prisma.message.deleteMany({ where: { streamId: stream.id } });
      await prisma.stream.delete({ where: { id: stream.id } });
      await prisma.user.delete({ where: { id: viewer.id } });
    }
  });
});
