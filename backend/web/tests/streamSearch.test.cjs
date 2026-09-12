require("ts-node/register");
const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const prismaModule = require("../src/prismaClient");
const original = prismaModule.default;
let calls = 0;
const rows = [
  { id: 1, startTime: new Date("2026-07-08T22:00:00Z"), endTime: null, segments: [{ title: "pushing 40(00 rio score)" }], youtubeVideos: [] },
  { id: 2, startTime: new Date("2026-07-29T12:00:00Z"), endTime: null, segments: [{ title: "pushing 40(00 rio score)" }], youtubeVideos: [] },
  { id: 3, startTime: new Date("2026-07-09T12:00:00Z"), endTime: null, segments: [{ title: "split recording" }], youtubeVideos: [{ id: "aaaaaaaaaaa", title: "split recording osa 2", available: true, streamOffsetSeconds: 12000, durationSeconds: 5000, matchSource: "manual" }] },
];
prismaModule.default = { youTubeVideo: { findUnique: async () => ({ title: "9.7.2026 - pushing 40(00 rio score)" }) }, stream: { findMany: async (query) => {
  calls++; assert.equal(query.select.messages, undefined); return rows;
} } };
after(() => { prismaModule.default = original; });
const { StreamSearchService, parseSearchQuery } = require("../src/services/streamSearch.service");

test("validates bounded queries and rejects arrays, unsafe IDs and oversized limits", () => {
  for (const query of [{}, { q: ["hello"] }, { q: "x" }, { q: "x".repeat(301) }, { q: "title", limit: "11" }, { youtubeId: "../private" }]) assert.equal(parseSearchQuery(query), null);
  assert.deepEqual(parseSearchQuery({ youtubeId: "aaaaaaaaaaa" }), { q: "", youtubeId: "aaaaaaaaaaa", limit: 10 });
});
test("fuzzy matching uses Finnish recording date, supports typos and ignores promotional URLs", async () => {
  const result = await new StreamSearchService().search({ q: "9.7.2026 - pushing 40(00 rio scor) - https://example.com", limit: 10 });
  assert.deepEqual(result.matches.map(m => m.id), [1]);
  assert.equal(result.suggestedStreamId, 1);
  assert.equal(result.matches[0].streamOffsetSeconds, null);
  assert.equal(result.matches[0].alignment, "unknown");
});
test("exact association outranks an unrelated supplied title and preserves a split offset", async () => {
  const result = await new StreamSearchService().search({ q: "29.7.2026 - pushing 40(00 rio score)", youtubeId: "aaaaaaaaaaa", limit: 10 });
  assert.equal(result.suggestedStreamId, 3);
  assert.equal(result.matches[0].identity, "linked");
  assert.equal(result.matches[0].streamOffsetSeconds, 12000);
  assert.equal(result.matches[0].mappingSource, "manual");
  assert.equal(result.matches[0].alignment, "saved");
});
test("duplicate titles and undated generic titles stay manual; queries reuse the metadata snapshot", async () => {
  const service = new StreamSearchService();
  const before = calls;
  const results = await Promise.all([service.search({ q: "pushing 40(00 rio score)", limit: 10 }), service.search({ q: "pushing 40(00 rio score)", limit: 10 })]);
  assert.equal(calls - before, 1);
  assert.equal(results[0].suggestedStreamId, null);
  assert.equal(results[0].matches.length, 2);
  assert.equal((await service.search({ q: "recording", limit: 10 })).suggestedStreamId, null);
});
test("distinguishing numbers and split markers do not silently auto-match", async () => {
  const service = new StreamSearchService();
  assert.equal((await service.search({ q: "9.7.2026 - pushing 50(00 rio score)", limit: 10 })).matches.length, 0);
  assert.equal((await service.search({ q: "9.7.2026 - split recording osa 2", limit: 10 })).suggestedStreamId, null);
});
test("public search route precedes the numeric ID route", async () => {
  const express = require("express");
  const router = require("../src/routes/stream.routes").default;
  const app = express(); app.use("/api/streams", router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/streams/search`;
    const response = await fetch(url + "?youtubeId=aaaaaaaaaaa");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.matches[0].id, 3);
    assert.equal((await fetch(url + "?q=a&limit=999")).status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test("an indexed but unassigned YouTube ID can discover a stream from its stored title", async () => {
  const result = await new StreamSearchService().search({ q: "", youtubeId: "bbbbbbbbbbb", limit: 10 });
  assert.equal(result.suggestedStreamId, 1);
  assert.equal(result.matches[0].identity, "likely");
  assert.equal(result.matches[0].streamOffsetSeconds, null);
});
