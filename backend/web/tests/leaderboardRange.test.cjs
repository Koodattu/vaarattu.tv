require("ts-node/register");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getDateFromRange } = require("../src/utils/leaderboardRange");

test("rolling leaderboard periods clamp calendar boundaries and retain the UTC instant", () => {
  for (const [range, now, expected] of [
    ["month", "2030-03-31T12:34:56.789Z", "2030-02-28T12:34:56.789Z"],
    ["month", "2032-03-31T12:34:56.789Z", "2032-02-29T12:34:56.789Z"],
    ["month", "2030-01-31T00:30:00.000Z", "2029-12-31T00:30:00.000Z"],
    ["year", "2032-02-29T12:00:00.000Z", "2031-02-28T12:00:00.000Z"],
    ["week", "2030-10-28T00:30:00.000Z", "2030-10-21T00:30:00.000Z"],
  ]) {
    const date = new Date(now);
    assert.equal(getDateFromRange(range, date).toISOString(), expected, `${range} from ${now}`);
    assert.equal(date.toISOString(), now, "the caller's date must not mutate");
  }
  assert.equal(getDateFromRange("all", new Date("2030-03-31T12:00:00Z")), null);
});
