const assert = require("node:assert/strict");
const { test } = require("node:test");
const { parseTitle, rankMatches } = require("../src/services/youtubeMatching");
const stream = (id, title, date = "2026-07-09T12:00:00Z") => ({ id, startTime: new Date(date), youtubeMatchLocked: false, segments: [{ title }] });
const video = (id, title) => ({ id, title, available: true, streamId: null, matchSource: "unmatched" });

test("normalizes Finnish titles, URLs and parts while preserving stream date", () => {
  assert.deepEqual(parseTitle("9.7.2026 - HYVÄÄ päivää!! osa 2/3 - https://suomiwow.vaarattu.tv/"), { text: "hyvää päivää", date: "2026-07-09", part: 2 });
  assert.equal(parseTitle("31.2.2026 - invalid date").date, null);
});

test("matches any segment title, tolerating minor spelling and spacing changes", () => {
  const stored = stream(1, "unrelated first title");
  stored.segments.push({ title: "pushing 40(00 rio score) - https://suomiwow.vaarattu.tv/" });
  const result = rankMatches([stored], [video("a", "9.7.2026 - Pushing 40(00 rio scor)")]);
  assert.equal(result.automatic.length, 1);
  assert.equal(result.automatic[0].streamId, 1);
});

test("uses title dates in Helsinki time, never the upload timestamp", () => {
  const streams = [stream(1, "the same stream title", "2026-07-08T22:00:00Z"), stream(2, "the same stream title", "2026-07-08T12:00:00Z")];
  const result = rankMatches(streams, [{ ...video("a", "9.7.2026 - the same stream title"), publishedAt: "2020-01-01" }]);
  assert.equal(result.automatic.length, 1);
  assert.equal(result.automatic[0].streamId, 1);
});

test("does not force duplicate titles or second choices into unique assignments", () => {
  assert.equal(rankMatches([stream(1, "the same title"), stream(2, "the same title")], [video("a", "the same title")]).automatic.length, 0);
  assert.equal(rankMatches([stream(1, "the same title")], [video("a", "the same title"), video("b", "the same title")]).automatic.length, 0);
});

test("leaves split uploads, generic titles and different episode numbers for review", () => {
  assert.equal(rankMatches([stream(1, "the same title")], [video("a", "the same title part 1")]).automatic.length, 0);
  assert.equal(rankMatches([stream(1, "hello")], [video("a", "hello")]).automatic.length, 0);
  assert.equal(rankMatches([stream(1, "very long gaming episode 12")], [video("a", "very long gaming episode 13")]).automatic.length, 0);
});

test("preserves ownership and manual blocks, and ignores unavailable videos", () => {
  const a = video("a", "the same stream title");
  assert.equal(rankMatches([{ ...stream(1, a.title), youtubeMatchLocked: true }], [a]).automatic.length, 0);
  for (const patch of [{ streamId: 2 }, { available: false }, { matchSource: "blocked" }]) {
    assert.equal(rankMatches([stream(1, a.title)], [{ ...a, ...patch }]).automatic.length, 0);
  }
  const results = rankMatches([stream(1, "unique first stream"), stream(2, "completely different broadcast")], [video("a", "unique first stream"), video("b", "completely different broadcast")]);
  assert.equal(results.automatic.length, 2);
  assert.equal(new Set(results.automatic.map((item) => item.videoId)).size, 2);
});
