const assert = require("node:assert/strict");
const { test } = require("node:test");
process.env.OPENAI_API_KEY = "test-key";
const prismaModule = require("../src/prismaClient");
const unexpected = () => { throw new Error("Unexpected database query"); };
const db = { stream: { findFirst: unexpected }, game: { findUnique: unexpected }, streamSegment: { update: unexpected, create: unexpected } };
prismaModule.default = db;
const { processChannelUpdateEvent } = require("../src/services/stream.service");

test("records title-only changes but does not duplicate unchanged segments", async (t) => {
  t.mock.method(db.stream, "findFirst", async () => ({ id: 1, segments: [{ id: 10, gameId: 5, title: "Original title" }] }));
  t.mock.method(db.game, "findUnique", async () => ({ id: 5 }));
  const update = t.mock.method(db.streamSegment, "update", async () => ({}));
  const create = t.mock.method(db.streamSegment, "create", async () => ({}));
  const event = { categoryId: "game", categoryName: "Game", streamTitle: "Updated title", getGame: async () => null };
  await processChannelUpdateEvent(event);
  assert.equal(update.mock.callCount(), 1);
  assert.equal(create.mock.calls[0].arguments[0].data.title, "Updated title");
  assert.equal(create.mock.calls[0].arguments[0].data.streamId, 1);
  await processChannelUpdateEvent({ ...event, streamTitle: "Original title" });
  assert.equal(create.mock.callCount(), 1);
});
