const { chromium } = require("../../frontend/node_modules/@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const health = await (await fetch("http://127.0.0.1:33101/health")).json();
  if (health.fixture !== "vaarattu-browser") throw new Error("Expected the isolated synthetic API");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: "Europe/Helsinki" });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      return url.hostname === "127.0.0.1" && ["33101", "33102"].includes(url.port) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const chatRuns = [];
    for (let i = 0; i < 3; i++) {
      let requests = 0;
      const bodies = [];
      const onRequest = request => { if (request.url().includes("/messages?")) requests++; };
      const onResponse = response => {
        if (response.url().includes("/messages?") && response.ok()) bodies.push(response.body().then(body => body.length).catch(() => null));
      };
      page.on("request", onRequest);
      page.on("response", onResponse);
      const started = performance.now();
      await page.goto("http://127.0.0.1:33102/profiles/viewer01/chat-history");
      await page.getByText("Synthetic chat message 1000", { exact: true }).waitFor();
      const millisecondsToMessages = Math.round(performance.now() - started);
      const sizes = (await Promise.all(bodies)).filter(size => size !== null);
      chatRuns.push({ millisecondsToMessages, requests, completedResponses: sizes.length, bytes: sizes.reduce((a, b) => a + b, 0), rendered: await page.locator("main li").count() });
      page.off("request", onRequest);
      page.off("response", onResponse);
    }
    await page.screenshot({ path: path.join(__dirname, "chat-desktop.png") });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("http://127.0.0.1:33102/profiles?search=Community");
    await page.getByRole("link", { name: /Community Viewer/ }).nth(24).waitFor();
    const tablet = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    await page.screenshot({ path: path.join(__dirname, "profiles-tablet.png"), fullPage: true });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    const enlargedText = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    await page.screenshot({ path: path.join(__dirname, "profiles-text-200.png"), fullPage: true });
    const report = { environment: "Chromium, Next development server, Helsinki timezone, 1,000 synthetic messages", chatRuns, tablet, enlargedText, errors };
    fs.writeFileSync(path.join(__dirname, "final-browser.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report, null, 2));
    if (errors.length || tablet.content > tablet.viewport || enlargedText.content > enlargedText.viewport) throw new Error("Browser quality checks failed");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
