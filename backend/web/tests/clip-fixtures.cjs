// Synthetic metadata only; no Twitch calls or media downloads.
module.exports = async function seedClips(prisma) {
  for (let i = 1; i <= 15; i++) {
    const id = `BrowserClip${String(i).padStart(2, "0")}`;
    const data = {
      broadcasterId: "browser-broadcaster", title: i === 1 ? "One last jump. What could go wrong?" : `Cave expedition — community moment ${i}`,
      creatorName: i === 1 ? "CommunityViewer" : "CaveExplorer", gameId: "browser-clip-game", gameName: i === 1 ? "Jump King" : "Deep Rock Galactic",
      thumbnailUrl: i === 15 ? null : `http://127.0.0.1:33101/fixture-thumbnail/${i % 3}.svg`,
      createdAt: new Date(Date.now() - i * 86400000), durationSeconds: 24.5 + i, viewCount: (16 - i) * 100,
      isFeatured: i <= 3, available: true, checkedAt: new Date(),
      videoId: i === 2 ? "9000000002" : null, vodOffsetSeconds: i === 2 ? 45 : null,
    };
    await prisma.clip.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
  await prisma.clip.upsert({ where: { id: "BrowserClipUnavailable" }, update: {}, create: {
    id: "BrowserClipUnavailable", broadcasterId: "browser-broadcaster", title: "A moment from the archive", creatorName: "CommunityViewer",
    createdAt: new Date(), durationSeconds: 30, viewCount: 2000, available: false, checkedAt: new Date(),
  } });
};
