const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Completions } = require("openai/resources/chat/completions");

process.env.OPENAI_API_KEY = "test-key";
const { generateOrUpdateAISummary, testOpenAIConnection } = require("../src/services/openai.service");

const messages = [{ content: "Hyvä peli!", timestamp: new Date("2026-01-01") }];

test("profile generation returns only complete, nonempty, unrefused text", async (t) => {
  const cases = [
    { name: "complete profile", finish_reason: "stop", content: "  Valmis profiili.  ", expected: "Valmis profiili." },
    { name: "truncated profile", finish_reason: "length", content: "Kesken jäänyt", expected: null },
    { name: "reasoning exhausted the budget", finish_reason: "length", content: "", expected: null },
    { name: "filtered profile", finish_reason: "content_filter", content: "Osittainen", expected: null },
    { name: "refusal", finish_reason: "stop", content: "Teksti", refusal: "Refused", expected: null },
    { name: "empty profile", finish_reason: "stop", content: "  ", expected: null },
  ];

  for (const entry of cases) {
    await t.test(entry.name, async (t) => {
      t.mock.method(Completions.prototype, "create", async () => ({
        choices: [{ finish_reason: entry.finish_reason, message: { content: entry.content, refusal: entry.refusal } }],
      }));
      assert.equal(await generateOrUpdateAISummary("test", null, messages), entry.expected);
    });
  }
});

test("connection probe requires a complete OK response", async (t) => {
  const cases = [
    { name: "successful probe", finish_reason: "stop", content: "OK", expected: true },
    { name: "truncated probe", finish_reason: "length", content: "OK", expected: false },
    { name: "empty probe", finish_reason: "stop", content: "", expected: false },
    { name: "unexpected response", finish_reason: "stop", content: "Hello", expected: false },
    { name: "refused probe", finish_reason: "stop", content: "OK", refusal: "Refused", expected: false },
  ];

  for (const entry of cases) {
    await t.test(entry.name, async (t) => {
      t.mock.method(Completions.prototype, "create", async () => ({
        choices: [{ finish_reason: entry.finish_reason, message: { content: entry.content, refusal: entry.refusal } }],
      }));
      assert.equal(await testOpenAIConnection(), entry.expected);
    });
  }
});

test("missing choices fail without accepting a profile or connection", async (t) => {
  t.mock.method(Completions.prototype, "create", async () => ({ choices: [] }));
  assert.equal(await generateOrUpdateAISummary("test", null, messages), null);
  assert.equal(await testOpenAIConnection(), false);
});

test("API failures return failure results", async (t) => {
  t.mock.method(Completions.prototype, "create", async () => { throw new Error("rate_limit"); });
  assert.equal(await generateOrUpdateAISummary("test", null, messages), null);
  assert.equal(await testOpenAIConnection(), false);
});
