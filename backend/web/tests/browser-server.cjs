// Runs the real API against synthetic data only. Never loads a .env file.
const assert = require("node:assert/strict");
const path = require("node:path");
assert.equal(process.env.VOD_TEST_DATABASE_URL, "postgresql://postgres@127.0.0.1:35489/postgres");
process.env.DATABASE_URL = process.env.VOD_TEST_DATABASE_URL;
require("ts-node").register({ project: path.join(__dirname, "../tsconfig.json") });
const express = require("express");
const cors = require("cors");
const prisma = require("../src/prismaClient").default;

async function start() {
  // Keep period filters useful on every run, with chat spanning local midnight.
  const fixtureDay = new Date(Date.now() - 86400000);
  fixtureDay.setUTCHours(12, 0, 0, 0);
  const offset = new Intl.DateTimeFormat("en", { timeZone: "Europe/Helsinki", timeZoneName: "shortOffset" })
    .formatToParts(fixtureDay).find(part => part.type === "timeZoneName").value;
  const startTime = new Date(fixtureDay);
  startTime.setUTCHours(23 - Number(offset.replace("GMT", "")), 55);
  const endTime = new Date(startTime.getTime() + 170 * 60000);
  const game = await prisma.game.upsert({ where: { twitchId: "browser-game" }, update: {}, create: { twitchId: "browser-game", name: "Community game night" } });
  const stream = await prisma.stream.upsert({ where: { twitchId: "browser-stream" }, update: {}, create: {
    twitchId: "browser-stream", startTime, endTime,
    segments: { create: { startTime, endTime, title: "Community night — a synthetic local recording", gameId: game.id } },
  } });
  for (let i = 1; i <= 25; i++) {
    const login = `viewer${String(i).padStart(2, "0")}`;
    const user = await prisma.user.upsert({ where: { login }, update: {}, create: {
      login, twitchId: `browser-${login}`, displayName: `Community Viewer ${String(i).padStart(2, "0")}`,
      viewerProfile: { create: { totalMessages: i === 1 ? 1000 : 100, totalWatchTime: 170, lastSeen: endTime } },
    } });
    if (i === 1) {
      await prisma.message.createMany({ skipDuplicates: true, data: Array.from({ length: 1000 }, (_, n) => ({
        twitchId: `browser-message-${n}`, userId: user.id, streamId: stream.id,
        timestamp: new Date(startTime.getTime() + n * 10000),
        content: `Synthetic chat message ${String(n + 1).padStart(4, "0")}${n % 10 === 0 ? " — welcome to game night" : ""}`,
      })) });
      if (!await prisma.viewSession.count({ where: { userId: user.id, streamId: stream.id } })) {
        await prisma.viewSession.create({ data: { userId: user.id, streamId: stream.id, sessionStart: startTime, sessionEnd: endTime } });
      }
    }
  }
  await prisma.user.upsert({ where: { login: "newviewer" }, update: {}, create: { login: "newviewer", twitchId: "browser-newviewer", displayName: "New Viewer" } });
  const viewer = await prisma.user.findUniqueOrThrow({ where: { login: "viewer01" } });
  const reward = await prisma.channelReward.upsert({ where: { twitchId: "browser-reward" }, update: {}, create: { twitchId: "browser-reward", title: "Choose the next game", cost: 500, isEnabled: true } });
  const viewers = await prisma.user.findMany({ where: { twitchId: { startsWith: "browser-" } }, select: { id: true, login: true } });
  for (const user of viewers) {
    await prisma.redemption.upsert({ where: { twitchId: `browser-redemption-${user.id}` }, update: {}, create: { twitchId: `browser-redemption-${user.id}`, userId: user.id, streamId: stream.id, rewardId: reward.twitchId, timestamp: endTime } });
    if (user.login !== "newviewer") {
      if (!await prisma.cheer.count({ where: { userId: user.id } })) await prisma.cheer.create({ data: { userId: user.id, bits: 100, timestamp: endTime } });
      if (!await prisma.subscriptionGift.count({ where: { userId: user.id } })) await prisma.subscriptionGift.create({ data: { userId: user.id, amount: 1, tier: "1000", timestamp: endTime } });
    }
  }
  for (let i = 1; i <= 28; i++) {
    const name = `GameNight${String(i).padStart(2, "0")}`;
    const platform = i <= 2 ? "twitch" : "bttv";
    const emote = await prisma.emote.upsert({ where: { name_platform: { name, platform } }, update: {}, create: { name, platform, emoteId: `browser-${i}` } });
    if (i < 28) await prisma.emoteUsage.upsert({ where: { userId_emoteId: { userId: viewer.id, emoteId: emote.id } }, update: {}, create: { userId: viewer.id, emoteId: emote.id, count: 1000 - i } });
  }
  const app = express();
  app.use(cors());
  const archiveViewer = await prisma.user.findUniqueOrThrow({ where: { login: "viewer02" } });
  await require("./stream-fixtures.cjs")(prisma, fixtureDay, archiveViewer.id);
  await require("./clip-fixtures.cjs")(prisma);
  app.get("/fixture-thumbnail/:id.svg", (req, res) => {
    const colors = ["#312e81", "#134e4a", "#44403c"];
    const color = colors[Number(req.params.id)] || colors[0];
    res.type("svg").send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="${color}"/><path d="M0 300 120 100 240 240 370 80 640 300V360H0Z" fill="#111827"/><text x="32" y="52" fill="#fff" font-family="sans-serif" font-size="24">Synthetic community recording</text></svg>`);
  });
  for (const route of ["leaderboard", "user", "stream", "mod", "clip"]) {
    const prefix = { leaderboard: "leaderboards", user: "users", stream: "streams", mod: "mod", clip: "clips" }[route];
    app.use(`/api/${prefix}`, require(`../src/routes/${route}.routes`).default);
  }
  app.get("/health", (_req, res) => res.json({ success: true, fixture: "vaarattu-browser" }));
  app.use(require("../src/middleware/errorHandler").errorHandler);
  const server = app.listen(33101, "127.0.0.1", (error) => {
    if (error) { console.error(error.message); void prisma.$disconnect(); process.exitCode = 1; return; }
    console.log("Synthetic test API: http://127.0.0.1:33101");
  });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(async () => { await prisma.$disconnect(); process.exit(0); }));
}
start().catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exitCode = 1; });
