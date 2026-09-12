const assert = require("node:assert/strict");
const { test } = require("node:test");
const prismaModule = require("../src/prismaClient");
const unexpected = () => { throw new Error("Unexpected database query"); };
const db = { stream: { findUnique: unexpected, create: unexpected }, game: { findUnique: unexpected } };
prismaModule.default = db;
const rewards = require("../src/services/channelReward.service");
const badges = require("../src/services/twitchBadge.service");
const emotes = require("../src/services/emote.service");
const { streamState } = require("../src/services/streamState.service");
const { processStreamOnlineEvent } = require("../src/services/stream.service");

for (const mode of ["reject", "stall"]) {
  test(`a stream is saved and activated when optional metadata services ${mode}`, async (t) => {
    t.mock.method(console, "log", () => {});
    const errors = t.mock.method(console, "error", () => {});
    const calls = [];
    let release;
    const pending = new Promise((resolve) => { release = resolve; });
    t.after(async () => { release(); await new Promise((resolve) => setImmediate(resolve)); });
    t.mock.method(db.game, "findUnique", async () => ({ id: 5 }));
    t.mock.method(db.stream, "findUnique", async () => null);
    const saved = { id: 42, segments: [] };
    const create = t.mock.method(db.stream, "create", async () => { calls.push("saved"); return saved; });
    t.mock.method(streamState, "startStream", async (id) => { assert.equal(id, saved.id); calls.push("active"); });
    for (const [module, name] of [[rewards, "syncChannelPointRewards"], [badges, "updateAvailableBadges"], [emotes, "initializeEmotes"]]) {
      t.mock.method(module, name, () => {
        calls.push(name);
        if (mode === "reject") throw new Error("Optional API unavailable");
        return pending;
      });
    }
    const stream = { id: "twitch-stream", gameId: "game", gameName: "Game", startDate: new Date("2026-09-13"), title: "Live", getGame: async () => null };
    assert.equal(await processStreamOnlineEvent({ broadcasterName: "test", getStream: async () => stream }), saved);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls.slice(0, 2), ["saved", "active"]);
    assert.equal(calls.length, 5);
    assert.equal(create.mock.calls[0].arguments[0].data.twitchId, stream.id);
    assert.equal(errors.mock.callCount(), mode === "reject" ? 3 : 0);
  });
}
