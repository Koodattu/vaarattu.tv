// Additional bounded, synthetic archive data for browser review. Caller guards DB identity.
module.exports = async function seedArchive(prisma, fixtureDay, userId) {
  const games = [];
  for (const [index, name] of ["Just Chatting", "Deep Rock Galactic", "Hollow Knight"].entries()) {
    games.push(await prisma.game.upsert({ where: { twitchId: `archive-game-${index}` }, update: {}, create: { twitchId: `archive-game-${index}`, name } }));
  }
  for (let i = 1; i <= 26; i++) {
    const twitchId = `browser-archive-${String(i).padStart(2, "0")}`;
    if (await prisma.stream.findUnique({ where: { twitchId } })) continue;
    const startTime = new Date(fixtureDay.getTime() - i * 86400000);
    const at = seconds => new Date(startTime.getTime() + seconds * 1000);
    const stream = await prisma.stream.create({ data: {
      twitchId, startTime, endTime: at(5400),
      twitchVideoId: i === 2 ? "9000000002" : null, twitchVideoAvailable: i === 2 ? true : null, twitchVideoCheckedAt: i === 2 ? new Date() : null,
      thumbnailUrl: `http://127.0.0.1:33101/fixture-thumbnail/${i % 3}.svg`,
      segments: { create: [
        { title: i === 1 ? "Back to the caves — community expedition" : `Community archive ${String(i).padStart(2, "0")} — ${games[i % 3].name}`, gameId: games[0].id, startTime, endTime: at(1800) },
        { title: i === 1 ? "Deep dives, unexpected detours, and one more mission with the whole crew" : `Evening session ${i}`, gameId: games[i % 3].id, startTime: at(1800), endTime: at(4200) },
        { title: "Wrapping up with chat", gameId: games[0].id, startTime: at(4200), endTime: at(5400) },
      ] },
      youtubeVideos: i % 2 === 1 ? { create: [
        { id: `fixture${String(i).padStart(2, "0")}a1`, channelId: "synthetic", title: `Community archive ${i} · Part 1`, position: 1, streamOffsetSeconds: 0, durationSeconds: 2400, checkedAt: new Date() },
        { id: `fixture${String(i).padStart(2, "0")}b2`, channelId: "synthetic", title: `Community archive ${i} · Part 2`, position: 2, streamOffsetSeconds: 2400, durationSeconds: 3000, checkedAt: new Date() },
      ] } : undefined,
    } });
    if (i !== 1) continue;
    await prisma.viewSession.create({ data: { userId, streamId: stream.id, sessionStart: startTime, sessionEnd: at(5400) } });
    await prisma.message.createMany({ data: Array.from({ length: 500 }, (_, n) => ({
      twitchId: `browser-archive-message-${n}`, userId, streamId: stream.id,
      timestamp: at(n < 100 ? n * 10 : n < 300 ? 1800 + (n - 100) * 2 : 4200 + (n - 300) * 5),
      content: `Synthetic expedition message ${n + 1}${n % 17 === 0 ? " — Rock and stone!" : ""}`,
    })) });
    await prisma.streamViewerSample.createMany({ data: Array.from({ length: 90 }, (_, minute) => minute >= 25 && minute < 35 ? null : ({ streamId: stream.id, timestamp: at(minute * 60), viewerCount: minute === 40 ? 72 : 20 + minute % 11 })).filter(Boolean) });
  }
  await prisma.stream.update({ where: { twitchId: "browser-archive-03" }, data: { twitchVideoId: "9000000003", twitchVideoAvailable: true, twitchVideoCheckedAt: new Date() } });
  await prisma.youTubeVideo.update({ where: { id: "fixture05a1" }, data: { streamOffsetSeconds: 300, durationSeconds: 2100 } });
  await prisma.youTubeVideo.update({ where: { id: "fixture05b2" }, data: { streamOffsetSeconds: 3000, durationSeconds: 2400 } });
};
