const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadAuth(name, dependencies, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src/twitch/auth", `${name}.ts`), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const context = {
    exports: {}, __dirname: "/app/twitch/dist/twitch/auth", process: { env: {} },
    console: { log() {}, error() {} }, URLSearchParams,
    require: (name) => {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected import: ${name}`);
      return dependencies[name];
    }, ...globals,
  };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

test("Compose mounts both tokens exactly where the compiled collector reads and refreshes them", () => {
  const provider = loadAuth("authProviders", { "@twurple/auth": {}, fs: {}, path: path.posix });
  const compose = fs.readFileSync(path.join(__dirname, "../../../docker-compose.yml"), "utf8");
  const mounts = [...compose.matchAll(/- (\.\/backend\/twitch\/tokens\.(streamer|bot)\.json):([^\s]+)/g)];
  assert.equal(mounts.length, 2);
  for (const [, , account, destination] of mounts) assert.equal(destination, provider.getTokenPaths()[account]);
});

test("OAuth completion closes only its own server and resumes services without exiting the process", async () => {
  const callbacks = {};
  const closed = [];
  const resumed = [];
  const writes = [];
  const service = loadAuth("dualAuthServer", {
    express: () => {
      let handler;
      return {
        get(route, callback) { assert.equal(route, "/twitch/callback"); handler = callback; },
        listen(port) {
          callbacks[port] = handler;
          return { close() { closed.push(port); }, on() {} };
        },
      };
    },
    "@twurple/auth": { exchangeCode: async () => ({ accessToken: "synthetic-token" }) },
    fs: { writeFileSync(file) { writes.push(file); } },
    "./authProviders": { getTokenPaths: () => ({ streamer: "/streamer", bot: "/bot" }) },
  }, {
    fetch: async () => ({ json: async () => ({ user_id: "synthetic-user" }) }),
    setTimeout() { assert.fail("OAuth must not schedule a process exit"); },
    process: { env: {}, exit() { assert.fail("OAuth must not stop collection"); } },
  });
  service.startTwitchAuthServer("streamer", () => resumed.push("streamer"));
  service.startTwitchAuthServer("bot", () => resumed.push("bot"));
  const response = { send() {}, status() { assert.fail("Authorization should succeed"); } };
  await callbacks[3002]({ query: { code: "synthetic-code" } }, response);
  assert.deepEqual(closed, [3002]);
  assert.deepEqual(resumed, ["bot"]);
  await callbacks[3001]({ query: { code: "synthetic-code" } }, response);
  assert.deepEqual(closed, [3002, 3001]);
  assert.deepEqual(resumed, ["bot", "streamer"]);
  assert.deepEqual(writes, ["/bot", "/streamer"]);
});
