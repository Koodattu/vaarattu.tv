import { test, expect, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
test.beforeEach(async ({ page, request }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", error => messages.push(error.message));
  expect(await (await request.get("http://127.0.0.1:33101/health")).json()).toEqual({ success: true, fixture: "vaarattu-browser" });
  await page.route("**/*", route => ["http://127.0.0.1:33101", "http://127.0.0.1:33102"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  await page.route(/https:\/\/(clips|player)\.twitch\.tv\//, route => route.fulfill({ contentType: "text/html", body: "<p>Synthetic Twitch player</p>" }));
});

test("archive retry, empty results and out-of-range pages retain useful context", async ({ page }) => {
  const endpoint = "**/api/clips?*";
  await page.route(endpoint, route => route.fulfill({ status: 503, json: { success: false } }));
  await page.goto("/clips?q=cave");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("searchbox")).toHaveValue("cave");
  await page.unroute(endpoint);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("status")).toHaveText("14 clips found");
  await page.getByRole("searchbox").fill("no-such-clip");
  await page.getByRole("searchbox").press("Enter");
  await expect(page.getByRole("heading", { name: "No matching clips" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("status")).toHaveText("15 clips");
  await page.goto("/clips?q=cave&page=999");
  await page.getByRole("button", { name: "Return to first page" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("cave");
  await expect(page.locator("main article")).toHaveCount(12);
  await page.route(endpoint, route => route.fulfill({ json: { success: true, data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } } }));
  await page.goto("/clips");
  await expect(page.getByRole("heading", { name: "No clips yet" })).toBeVisible();
});

test("playback loads on intent, shares a clean permalink and supports clipboard recovery", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { (window as Window & { copiedLink?: string }).copiedLink = value; } } }));
  await page.goto("/clips/BrowserClip01?returnTo=%2Fclips%3Fq%3Djump");
  await expect(page.getByRole("button", { name: "Play clip" })).toBeVisible();
  await expect(page.locator("main iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Play clip" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("main iframe")).toHaveAttribute("src", "https://clips.twitch.tv/embed?clip=BrowserClip01&parent=127.0.0.1&autoplay=true");
  await expect(page.getByRole("link", { name: "Watch on Twitch" })).toHaveAttribute("href", "https://clips.twitch.tv/BrowserClip01");
  await page.getByRole("button", { name: "Reload player" }).click();
  await expect(page.locator("main iframe")).toHaveCount(1);
  await page.getByRole("button", { name: "Copy clip link" }).click();
  await expect(page.getByRole("status")).toHaveText("Clip link copied.");
  expect(await page.evaluate(() => (window as Window & { copiedLink?: string }).copiedLink)).toBe("http://127.0.0.1:33102/clips/BrowserClip01");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Clipboard denied"); } } }));
  await page.getByRole("button", { name: "Copy clip link" }).click();
  await expect(page.getByLabel("Clip link", { exact: true })).toHaveValue("http://127.0.0.1:33102/clips/BrowserClip01");
  await page.getByRole("link", { name: "Back to clips" }).click();
  await expect(page).toHaveURL(/q=jump/);
});

test("small screens offer Twitch playback without overflow; unavailable links stay readable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/clips");
  await expect(page.locator("main article")).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.screenshot({ path: "../work/goal-improvement/clips/archive-mobile.png" });
  await page.getByRole("link", { name: /One last jump/ }).click();
  await expect(page.getByRole("link", { name: "Watch on Twitch" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play clip" })).toHaveCount(0);
  await expect(page.locator("main iframe")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.screenshot({ path: "../work/goal-improvement/clips/watch-mobile.png" });
  await page.goto("/clips/BrowserClipUnavailable?returnTo=https%3A%2F%2Fexample.com");
  await expect(page.getByRole("heading", { name: "This clip is no longer available on Twitch" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to clips" })).toHaveAttribute("href", "/clips");
  await expect(page.locator("main iframe")).toHaveCount(0);
  await page.goto("/clips/UnknownClip");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("not found");
  await expect(page.getByRole("link", { name: "Back to clips" })).toBeVisible();
});

test("home shows real popular clips and recovers independently from an API failure", async ({ page }) => {
  await page.route("**/api/clips?*", route => route.fulfill({ status: 503, json: { success: false } }));
  await page.goto("/");
  const section = page.getByRole("region", { name: "Popular clips" });
  await expect(section.getByRole("alert")).toBeVisible();
  await page.unroute("**/api/clips?*");
  await section.getByRole("button", { name: "Try clips again" }).click();
  await expect(section.getByRole("article")).toHaveCount(3);
  await expect(section.getByText("1,500 views")).toBeVisible();
  await section.getByRole("link", { name: /One last jump/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("One last jump. What could go wrong?");
});

test("a stalled player offers recovery and a failed detail request can be retried", async ({ page }) => {
  const detail = "**/api/clips/BrowserClip01";
  await page.route(detail, route => route.fulfill({ status: 503, json: { success: false } }));
  await page.goto("/clips/BrowserClip01");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("temporarily unavailable");
  await page.unroute(detail);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: "Play clip" })).toBeVisible();
  await page.route("https://clips.twitch.tv/embed?*", () => {});
  await page.clock.install();
  await page.getByRole("button", { name: "Play clip" }).click();
  await page.clock.fastForward(12001);
  await expect(page.getByRole("status")).toContainText("taking longer than expected");
  await page.unroute("https://clips.twitch.tv/embed?*");
  await page.getByRole("button", { name: "Reload player" }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator("main iframe")).toHaveCount(1);
});

test("a source recording opens at the clip's exact VOD offset", async ({ page }) => {
  await page.route("https://player.twitch.tv/js/embed/v1.js", route => route.fulfill({ contentType: "text/javascript", body: `
    class Player {
      static READY = 'ready'; static ENDED = 'ended';
      constructor(id, options) { this.time = parseInt(options.time); const mount = document.getElementById(id); mount.dataset.clipStart = String(this.time); mount.textContent = 'Synthetic source recording'; }
      addEventListener(event, callback) { if (event === 'ready') setTimeout(callback, 0); }
      getCurrentTime() { return this.time; } pause() {}
    } window.Twitch = {Player};` }));
  await page.goto("/clips/BrowserClip02");
  const source = page.getByRole("link", { name: "View source stream" });
  await expect(source).toHaveAttribute("href", /\/vods\/\d+\/watch\?t=45$/);
  await source.click();
  await expect(page).toHaveURL(/\/watch\?t=45$/);
  await expect(page.locator('[data-clip-start="45"]')).toBeVisible();
});

test("browse, search, filter, paginate and return from a shareable clip", async ({ page }) => {
  await page.goto("/clips");
  await expect(page.getByRole("status")).toHaveText("15 clips");
  await expect(page.getByRole("link", { name: /One last jump/ })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("link", { name: /community moment 13/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cave expedition — community moment 13");
  await page.getByRole("link", { name: "Back to clips" }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("searchbox", { name: "Search clips" }).fill("cave");
  await page.getByText("Sort and filters", { exact: true }).click();
  await page.getByLabel("Sort by").selectOption("newest");
  await page.getByLabel("Created").selectOption("7d");
  await page.getByLabel("Featured only").check();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("status")).toHaveText("2 clips found");
  await page.reload();
  await expect(page.getByRole("searchbox")).toHaveValue("cave");
  await expect(page.getByLabel("Featured only")).toBeChecked();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("status")).toHaveText("15 clips");
});
