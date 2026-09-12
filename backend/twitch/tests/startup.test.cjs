const assert = require("node:assert/strict");
const { test } = require("node:test");
const dotenv = require("dotenv");
const fs = require("node:fs");
const prismaModule = require("../src/prismaClient");
const prisma = { $connect: async () => {} };
prismaModule.default = prisma;
const auth = require("../src/twitch/auth/authProviders");
const oauth = require("../src/twitch/auth/dualAuthServer");
const polling = require("../src/twitch/api/streamPolling.service");
const eventsub = require("../src/twitch/api/eventsub");
const chat = require("../src/twitch/api/chat");
const handlers = require("../src/twitch/api/chatHandlers");
const youtube = require("../src/services/youtube.service");
const openai = require("../src/services/openai.service");
const rewards = require("../src/services/channelReward.service");
const badges = require("../src/services/twitchBadge.service");
const emotes = require("../src/services/emote.service");
const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(t, missing = []) {
  t.mock.method(dotenv, "config", () => ({}));
  const { start } = require("../src/index");
  t.mock.method(console, "log", () => {});
  const errors = t.mock.method(console, "error", () => {});
  const calls = [];
  const authorized = {};
  t.mock.method(prisma, "$connect", async () => {});
  t.mock.method(auth, "getTokenPaths", () => ({ streamer: "streamer", bot: "bot" }));
  t.mock.method(fs, "existsSync", (name) => !missing.includes(name));
  t.mock.method(oauth, "startTwitchAuthServer", (account, callback) => { authorized[account] = callback; });
  t.mock.method(polling, "startStreamStatusPolling", () => calls.push("polling"));
  t.mock.method(eventsub, "startEventSubWs", async () => { calls.push("eventsub"); });
  t.mock.method(chat, "tryCreateChatClient", async () => ({ connect: async () => { calls.push("bot"); } }));
  t.mock.method(handlers, "registerChatHandlers", () => {});
  for (const [module, name] of [[youtube, "startYoutubeSync"], [openai, "testOpenAIConnection"], [rewards, "syncChannelPointRewards"], [badges, "updateAvailableBadges"], [emotes, "initializeEmotes"]]) {
    t.mock.method(module, name, async () => {});
  }
  return { start, calls, authorized, errors };
}

test("all optional startup failures leave polling, EventSub and bot collection running", async (t) => {
  const { start, calls, errors } = setup(t);
  for (const [module, name] of [[youtube, "startYoutubeSync"], [openai, "testOpenAIConnection"], [rewards, "syncChannelPointRewards"], [badges, "updateAvailableBadges"], [emotes, "initializeEmotes"]]) {
    t.mock.method(module, name, () => { throw new Error("Service unavailable"); });
  }
  await start();
  await flush();
  assert.deepEqual(calls, ["polling", "eventsub", "bot"]);
  assert.equal(errors.mock.callCount(), 5);
});

test("stalled optional services cannot delay collection or launch overlapping refreshes", async (t) => {
  const { start, calls } = setup(t);
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  t.after(async () => { release(); await flush(); });
  const mocks = [];
  for (const [module, name] of [[youtube, "startYoutubeSync"], [openai, "testOpenAIConnection"], [rewards, "syncChannelPointRewards"], [badges, "updateAvailableBadges"], [emotes, "initializeEmotes"]]) {
    mocks.push(t.mock.method(module, name, () => pending));
  }
  await start();
  await flush();
  require("../src/services/channelMetadata.service").refreshChannelMetadata();
  await flush();
  assert.deepEqual(calls, ["polling", "eventsub", "bot"]);
  for (const mock of mocks) assert.equal(mock.mock.callCount(), 1);
});

test("bot failure cannot prevent EventSub or stream polling", async (t) => {
  const { start, calls } = setup(t);
  t.mock.method(chat, "tryCreateChatClient", async () => { throw new Error("Bot authentication failed"); });
  await start();
  await flush();
  assert.deepEqual(calls, ["polling", "eventsub"]);
});

test("EventSub failure cannot prevent stream polling or the bot connection", async (t) => {
  const { start, calls } = setup(t);
  t.mock.method(eventsub, "startEventSubWs", async () => { throw new Error("EventSub unavailable"); });
  await start();
  await flush();
  assert.deepEqual(calls, ["polling", "bot"]);
});

test("missing bot tokens do not block collection and bot authorization does not restart it", async (t) => {
  const missing = ["bot"];
  const { start, calls, authorized } = setup(t, missing);
  await start();
  await flush();
  assert.deepEqual(calls, ["polling", "eventsub"]);
  assert.deepEqual(Object.keys(authorized), ["bot"]);
  missing.length = 0;
  authorized.bot();
  authorized.bot();
  await flush();
  assert.deepEqual(calls, ["polling", "eventsub", "bot"]);
});

test("streamer authorization resumes collection even while bot authorization is pending", async (t) => {
  const missing = ["streamer", "bot"];
  const { start, calls, authorized, errors } = setup(t, missing);
  await start();
  await flush();
  assert.deepEqual(calls, []);
  assert.match(errors.mock.calls[0].arguments[0], /Stream collection is blocked/);
  missing.splice(missing.indexOf("streamer"), 1);
  authorized.streamer();
  await flush();
  assert.deepEqual(calls, ["polling", "eventsub"]);
  missing.length = 0;
  authorized.bot();
  await flush();
  assert.deepEqual(calls, ["polling", "eventsub", "bot"]);
});
