require("ts-node/register");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildStreamActivity } = require("../src/utils/streamActivity");

const start = new Date("2026-09-01T12:00:00Z");
const at = (minutes) => new Date(start.getTime() + minutes * 60000);
const session = (userId, from, to) => ({ userId, sessionStart: at(from), sessionEnd: to === null ? null : at(to) });

test("counts concurrent people once and handles simultaneous departures and arrivals", () => {
  const activity = buildStreamActivity(start, at(3), [
    session(1, -1, 1), session(1, 0.5, 1), session(2, 1, 2), session(3, 2, null),
  ], []);
  assert.deepEqual(activity.points.map((point) => point.viewers), [1, 1, 1]);
});

test("captures short sessions between sample boundaries and clamps them to the stream", () => {
  const activity = buildStreamActivity(start, at(2), [
    session(1, -1, 4), session(2, 0.2, 0.3), session(3, 2, 3), session(4, 1, 1),
  ], []);
  assert.deepEqual(activity.points.map((point) => point.viewers), [2, 1]);
});

test("uses actual interval duration for message rates, including the partial final minute", () => {
  const activity = buildStreamActivity(start, at(1.5), [], [
    { minute: 0, messages: 10, chatters: 3 }, { minute: 1, messages: 6, chatters: 2 },
  ]);
  assert.deepEqual(activity.points.map((point) => point.messagesPerMinute), [10, 12]);
  assert.deepEqual(activity.points.map((point) => point.activeChatters), [3, 2]);
  assert.deepEqual(activity.points.map((point) => point.viewers), [null, null]);
  assert.equal(activity.points[1].endTime, at(1.5).toISOString());
});

test("bounds long streams and uses peak minute chatters rather than summing unique speakers", () => {
  const activity = buildStreamActivity(start, at(601), [], [
    { minute: 0, messages: 12, chatters: 4 }, { minute: 1, messages: 6, chatters: 3 },
  ]);
  assert.equal(activity.intervalMinutes, 3);
  assert.ok(activity.points.length <= 300);
  assert.equal(activity.points[0].messagesPerMinute, 6);
  assert.equal(activity.points[0].activeChatters, 4);
});

test("handles empty streams and ignores observations outside the stream", () => {
  assert.deepEqual(buildStreamActivity(start, start, [], []).points, []);
  const activity = buildStreamActivity(start, at(1), [session(1, -2, -1)], [
    { minute: -1, messages: 99, chatters: 99 }, { minute: 1, messages: 99, chatters: 99 },
  ]);
  assert.equal(activity.points[0].viewers, null);
  assert.equal(activity.points[0].messagesPerMinute, 0);
});
