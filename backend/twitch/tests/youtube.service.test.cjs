const assert = require("node:assert/strict");
const { test } = require("node:test");
const prismaModule = require("../src/prismaClient");
const prisma = { $transaction: () => { throw new Error("Unexpected database write"); } };
prismaModule.default = prisma;
const { fetchYoutubeCatalog, syncYoutubeCatalog, durationSeconds, validateParts } = require("../src/services/youtube.service");

function response(items, nextPageToken) { return { ok: true, json: async () => ({ items, nextPageToken }) }; }
function setup(t) {
  const previous = { ...process.env };
  process.env.YT_API_KEY = "test-key";
  process.env.YT_CHANNEL = "@VaarattuVODs";
  t.after(() => { process.env = previous; });
}

test("follows all upload pages and refreshes video metadata using the exact channel", async (t) => {
  setup(t);
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    if (url.pathname.endsWith("channels")) {
      assert.equal(url.searchParams.get("forHandle"), "@VaarattuVODs");
      return response([{ id: "UC-exact", contentDetails: { relatedPlaylists: { uploads: "UU-exact" } } }]);
    }
    if (url.pathname.endsWith("playlistItems")) return url.searchParams.has("pageToken")
      ? response([{ contentDetails: { videoId: "b" } }])
      : response([{ contentDetails: { videoId: "a" } }], "page-two");
    assert.equal(url.searchParams.get("id"), "a,b");
    return response(["a", "b"].map((id) => ({ id, snippet: { title: `Updated ${id}`, channelId: "UC-exact", liveBroadcastContent: "none" }, contentDetails: { duration: "PT12H5M3S" }, status: { embeddable: id === "a", privacyStatus: "public", uploadStatus: "processed" } })));
  });
  const catalog = await fetchYoutubeCatalog();
  assert.equal(calls.length, 4);
  assert.equal(catalog.videos.length, 2);
  assert.equal(catalog.videos[0].durationSeconds, 43503);
  assert.equal(catalog.videos[1].available, false);
});

test("failed or malformed full scans cannot touch the database or leak the API key", async (t) => {
  setup(t);
  const write = t.mock.method(prisma, "$transaction", async () => { throw new Error("Must not write"); });
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("url contains test-key"); });
  await assert.rejects(syncYoutubeCatalog(), (error) => !error.message.includes("test-key") && error.message.includes("failed"));
  fetch.mock.restore();
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({}) }));
  await assert.rejects(syncYoutubeCatalog(), /incomplete/);
  assert.equal(write.mock.callCount(), 0);
});

test("quota errors retain the previous inventory", async (t) => {
  setup(t);
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 403 }));
  const write = t.mock.method(prisma, "$transaction", async () => {});
  await assert.rejects(syncYoutubeCatalog(), /HTTP 403/);
  assert.equal(write.mock.callCount(), 0);
});

test("a failure on a later playlist page cannot partially replace inventory", async (t) => {
  setup(t);
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.pathname.endsWith("channels")) return response([{ id: "UC-exact", contentDetails: { relatedPlaylists: { uploads: "UU-exact" } } }]);
    if (!url.searchParams.has("pageToken")) return response([{ contentDetails: { videoId: "a" } }], "next");
    return { ok: false, status: 503 };
  });
  const write = t.mock.method(prisma, "$transaction", async () => {});
  await assert.rejects(syncYoutubeCatalog(), /HTTP 503/);
  assert.equal(write.mock.callCount(), 0);
});

test("validates split offsets, duplicate IDs, and duration formats", () => {
  assert.equal(durationSeconds("P1DT1H"), 90000);
  assert.equal(durationSeconds("P0D"), 0);
  assert.throws(() => durationSeconds("unknown"), /invalid/);
  validateParts([{ videoId: "aaaaaaaaaaa", streamOffsetSeconds: 0 }, { videoId: "bbbbbbbbbbb", streamOffsetSeconds: 43200 }]);
  validateParts([]);
  for (const parts of [[{ videoId: "bad", streamOffsetSeconds: 0 }], [{ videoId: "aaaaaaaaaaa", streamOffsetSeconds: -1 }], [{ videoId: "aaaaaaaaaaa", streamOffsetSeconds: 0 }, { videoId: "aaaaaaaaaaa", streamOffsetSeconds: 10 }], [{ videoId: "aaaaaaaaaaa", streamOffsetSeconds: 0 }, { videoId: "bbbbbbbbbbb", streamOffsetSeconds: 0 }]]) {
    assert.throws(() => validateParts(parts));
  }
});
