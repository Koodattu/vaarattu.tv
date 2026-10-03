const { chromium } = require("../../frontend/node_modules/@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: "Europe/Helsinki" });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" && ["33101", "33102"].includes(url.port) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:33102/profiles");
  await page.getByRole("link", { name: /Community Viewer/ }).first().waitFor();
  await page.getByRole("textbox").fill("Community");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText('Showing results for "Community"').waitFor();
  await page.getByRole("link", { name: /Community Viewer/ }).nth(24).waitFor();
  const nextEnabledOnLastPage = await page.getByRole("button", { name: "Next", exact: true }).isEnabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("No users found", { exact: true }).waitFor();
  const previousAfterEmpty = await page.getByRole("button", { name: "Previous", exact: true }).count();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(__dirname, "baseline-mobile.png"), fullPage: true });
  const mobileWidth = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  await page.setViewportSize({ width: 1366, height: 900 });
  const requests = [];
  let bytes = 0;
  page.on("response", async response => { if (response.url().includes("/messages?")) { requests.push(response.url()); bytes += (await response.body()).length; } });
  const chatRuns = [];
  for (let i = 0; i < 3; i++) {
    requests.length = 0; bytes = 0;
    const started = Date.now();
    await page.goto("http://127.0.0.1:33102/profiles/viewer01/chat-history");
    await page.getByText("Synthetic chat message 1000", { exact: true }).waitFor();
    chatRuns.push({ millisecondsToMessages: Date.now() - started, requests: requests.length, bytes, rendered: await page.locator("main li").count() });
  }
  await page.screenshot({ path: path.join(__dirname, "baseline-chat.png"), fullPage: false });
  const report = { nextEnabledOnLastPage, previousAfterEmpty, mobileWidth, chatRuns, errors };
  fs.writeFileSync(path.join(__dirname, "baseline-browser.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
