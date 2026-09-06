require("ts-node/register");
const assert = require("node:assert/strict");
const { test } = require("node:test");

test("recording inventory, manual corrections, fallback and replay against isolated PostgreSQL", { skip: !process.env.VOD_TEST_DATABASE_URL }, async (t) => {
  // This suite only writes to the disposable localhost database documented for it.
  assert.equal(process.env.VOD_TEST_DATABASE_URL, "postgresql://postgres@127.0.0.1:55489/postgres");
  process.env.DATABASE_URL = process.env.VOD_TEST_DATABASE_URL;
  process.env.YT_API_KEY = "test-key";
  process.env.YT_CHANNEL = "@VaarattuVODs";
  const prisma = require("../src/prismaClient").default;
  const collectorDb = require("../../twitch/dist/prismaClient").default;
  t.after(async () => { await prisma.$disconnect(); await collectorDb.$disconnect(); });
  const { syncYoutubeCatalog, setRecordingParts, recordingReport } = require("../../twitch/dist/services/youtube.service");
  const { StreamService } = require("../src/services/stream.service");
  const { getChatReplay, parseReplayQuery } = require("../src/services/chatReplay.service");
  let catalog = [
    { id: "aaaaaaaaaaa", title: "9.7.2026 - an unmistakable stream title", duration: "PT30S" },
    { id: "bbbbbbbbbbb", title: "an entirely different video part 2", duration: "PT30S" },
  ];
  t.mock.method(globalThis, "fetch", async (url) => ({ ok: true, json: async () => {
    if (url.pathname.endsWith("channels")) return { items: [{ id: "UC-test", contentDetails: { relatedPlaylists: { uploads: "UU-test" } } }] };
    if (url.pathname.endsWith("playlistItems")) return { items: catalog.map((v) => ({ contentDetails: { videoId: v.id } })) };
    return { items: catalog.map((v) => ({ id: v.id, snippet: { title: v.title, channelId: "UC-test", liveBroadcastContent: "none" }, contentDetails: { duration: v.duration }, status: { embeddable: true, privacyStatus: "public", uploadStatus: "processed" } })) };
  } }));
  await prisma.youTubeVideo.deleteMany();
  await prisma.message.deleteMany();
  await prisma.streamSegment.deleteMany();
  await prisma.stream.deleteMany();
  await prisma.user.deleteMany();
  await prisma.game.deleteMany();
  const game = await prisma.game.create({ data: { twitchId: "fixture-game", name: "Test game" } });
  const startTime = new Date("2026-07-09T12:00:00Z");
  const stream = await prisma.stream.create({ data: { twitchId: "fixture-stream", twitchVideoId: "123", twitchVideoAvailable: false, startTime, endTime: new Date(startTime.getTime() + 90000), segments: { create: { startTime, title: "an unmistakable stream title", gameId: game.id } } } });
  const other = await prisma.stream.create({ data: { twitchId: "fixture-other", startTime } });
  const user = await prisma.user.create({ data: { twitchId: "fixture-viewer", login: "testviewer", displayName: "Test Viewer" } });
  await prisma.message.createMany({ data: Array.from({ length: 503 }, (_, i) => ({ twitchId: `fixture-message-${i}`, streamId: stream.id, userId: user.id, content: `message ${i}`, timestamp: new Date(startTime.getTime() + (i < 502 ? 5000 : 30000)) })) });

  assert.equal((await syncYoutubeCatalog()).matched, 1);
  assert.equal((await syncYoutubeCatalog()).matched, 0, "repeated sync is idempotent");
  assert.equal(await prisma.youTubeVideo.count(), 2);
  const originalVideo = catalog[0];
  catalog[0] = { ...originalVideo, id: "ccccccccccc" };
  const preview = await syncYoutubeCatalog(false);
  assert.equal(preview.matched, 0);
  assert.equal(preview.proposed, 1);
  assert.equal((await prisma.youTubeVideo.findUnique({ where: { id: "aaaaaaaaaaa" } })).streamId, stream.id, "catalog-only does not change assignments");
  assert.equal((await syncYoutubeCatalog()).matched, 1, "a replacement can match after automatic recording disappears");
  assert.equal((await prisma.youTubeVideo.findUnique({ where: { id: "aaaaaaaaaaa" } })).streamId, null);
  catalog[0] = originalVideo;
  assert.equal((await syncYoutubeCatalog()).matched, 1);
  catalog[0] = { ...originalVideo, title: "Completely unrelated renamed video" };
  catalog.push({ ...originalVideo, id: "eeeeeeeeeee" });
  assert.equal((await syncYoutubeCatalog()).matched, 1, "changed titles re-evaluate provisional automatic matches");
  assert.equal((await prisma.youTubeVideo.findUnique({ where: { id: "eeeeeeeeeee" } })).streamId, stream.id);
  assert.equal((await prisma.youTubeVideo.findUnique({ where: { id: "aaaaaaaaaaa" } })).streamId, null);
  catalog = [originalVideo, catalog[1]];
  assert.equal((await syncYoutubeCatalog()).matched, 1);
  let detail = await new StreamService().getStream(stream.id);
  assert.equal(detail.twitchVideoAvailable, false);
  assert.equal(detail.youtubeVideos[0].id, "aaaaaaaaaaa");
  await assert.rejects(setRecordingParts(other.id, [{ videoId: "aaaaaaaaaaa", streamOffsetSeconds: 0 }]), /another stream/);
  await assert.rejects(setRecordingParts(stream.id, [{ videoId: "ccccccccccc", streamOffsetSeconds: 0 }]), /playable/);
  await assert.rejects(setRecordingParts(stream.id, [{ videoId: "aaaaaaaaaaa", streamOffsetSeconds: 90 }]), /after the stream ended/);
  await prisma.youTubeVideo.create({ data: { id: "ddddddddddd", channelId: "UC-other", title: "Other channel", available: true, durationSeconds: 30, checkedAt: new Date() } });
  await assert.rejects(setRecordingParts(stream.id, [{ videoId: "ddddddddddd", streamOffsetSeconds: 0 }]), /configured archive channel/);
  await assert.rejects(setRecordingParts(stream.id, [{ videoId: "aaaaaaaaaaa", streamOffsetSeconds: 0 }, { videoId: "bbbbbbbbbbb", streamOffsetSeconds: 20 }]), /overlap/);
  await setRecordingParts(stream.id, [{ videoId: "aaaaaaaaaaa", streamOffsetSeconds: 10 }, { videoId: "bbbbbbbbbbb", streamOffsetSeconds: 40 }]);
  assert.equal((await syncYoutubeCatalog()).matched, 0);
  detail = await new StreamService().getStream(stream.id);
  assert.deepEqual(detail.youtubeVideos.map((v) => v.streamOffsetSeconds), [10, 40]);
  const report = (await recordingReport()).find((row) => row.streamId === stream.id);
  assert.equal(report.locked, true);
  assert.equal(report.recordings[0].matchSource, "manual");
  catalog[0] = { ...catalog[0], title: "A renamed archive video" };
  await syncYoutubeCatalog();
  assert.equal((await prisma.youTubeVideo.findUnique({ where: { id: "aaaaaaaaaaa" } })).streamId, stream.id, "title refresh preserves manual ownership");

  const first = await getChatReplay(stream.id, { start: 0, after: null });
  assert.equal(first.messages.length, 500);
  const second = await getChatReplay(stream.id, parseReplayQuery({ start: "0", after: first.nextCursor }));
  assert.equal(second.messages.length, 2);
  assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.messages, ...second.messages].map((row) => row.id)).size, 502);
  assert.equal((await getChatReplay(stream.id, { start: 30, after: null })).messages.length, 1);
  assert.equal((await getChatReplay(other.id, { start: 0, after: null })).messages.length, 0);
  const express = require("express");
  const app = express();
  app.use("/api/streams", require("../src/routes/stream.routes").default);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/streams`;
  // The HTTP client bypasses the mocked YouTube fetch to exercise actual routes.
  const request = async (path) => new Promise((resolve, reject) => require("node:http").get(`${base}${path}`, (res) => { let body = ""; res.on("data", (chunk) => { body += chunk; }); res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) })); }).on("error", reject));
  assert.equal((await request(`/${stream.id}/chat?start=0`)).body.data.messages.length, 500);
  assert.equal((await request(`/${stream.id}/chat?start=-1`)).status, 400);
  assert.equal((await request("/2147483647/chat?start=0")).status, 404);
  assert.equal((await request(`/${stream.id}`)).body.data.youtubeVideos.length, 2);

  catalog = catalog.slice(1);
  await syncYoutubeCatalog();
  assert.equal((await prisma.youTubeVideo.findUnique({ where: { id: "aaaaaaaaaaa" } })).available, false);
  assert.equal((await new StreamService().getStream(stream.id)).youtubeVideos.length, 1);
  await setRecordingParts(stream.id, []);
  catalog.push({ id: "aaaaaaaaaaa", title: "9.7.2026 - an unmistakable stream title", duration: "PT30S" });
  assert.equal((await syncYoutubeCatalog()).matched, 0, "manual removals remain blocked when a video reappears");
  assert.equal((await new StreamService().getStream(stream.id)).youtubeVideos.length, 0);
});
