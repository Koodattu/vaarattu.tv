import { test, expect, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }) => expect(browserErrors.get(page)).toEqual([]));

async function fakePlayers(page: Page) {
  await page.route("https://www.youtube.com/iframe_api", route => route.fulfill({ contentType: "text/javascript", body: `
    window.YT = {Player: class {
      constructor(mount, options) {
        this.time = options.playerVars.start; this.mount = mount;
        mount.dataset.testid = 'fixture-player'; mount.dataset.video = options.videoId;
        mount.dataset.start = String(this.time); mount.dataset.autoplay = String(options.playerVars.autoplay);
        mount.textContent = 'Synthetic video player';
        this.end = () => options.events.onStateChange({data:0});
        this.error = () => options.events.onError();
        window.addEventListener('fixture-player-ended', this.end);
        window.addEventListener('fixture-player-error', this.error);
        setTimeout(() => options.events.onReady(), 0);
      }
      getCurrentTime() { return this.time; }
      destroy() { window.removeEventListener('fixture-player-ended',this.end); window.removeEventListener('fixture-player-error',this.error); this.mount.remove(); }
    }}; window.onYouTubeIframeAPIReady();` }));
  await page.route("https://player.twitch.tv/js/embed/v1.js", route => route.fulfill({ contentType: "text/javascript", body: `
    class Player {
      static READY = 'ready'; static ENDED = 'ended';
      constructor(id, options) {
        this.time = parseInt(options.time); const mount = document.getElementById(id);
        mount.dataset.testid = 'fixture-player'; mount.dataset.video = options.video;
        mount.dataset.start = String(this.time); mount.textContent = 'Synthetic Twitch player';
      }
      addEventListener(event, callback) { if (event === 'ready') setTimeout(callback, 0); }
      getCurrentTime() { return this.time; } pause() {}
    } window.Twitch = {Player};` }));
}

test.beforeEach(async ({ page, request }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
  expect(await (await request.get("http://127.0.0.1:33101/health")).json()).toEqual({ success: true, fixture: "vaarattu-browser" });
  await page.route("**/*", route => ["http://127.0.0.1:33101", "http://127.0.0.1:33102"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
});

test("archive search, recording filters and page survive detail, Back and refresh", async ({ page }) => {
  await page.goto("/vods");
  await page.getByRole("searchbox", { name: "Search streams" }).fill("community");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=community/);
  await page.getByText(/Filter by date or recording/).click();
  await page.getByRole("checkbox", { name: "With recording" }).check();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("14 streams");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('main article')).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole("searchbox", { name: "Search streams" })).toHaveValue("community");
  await expect(page.getByRole("checkbox", { name: "With recording" })).toBeChecked();
  await page.locator('main article a').first().click();
  await page.getByRole("link", { name: "Back to VODs", exact: false }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('main article')).toHaveCount(2);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page).toHaveURL(/\/vods$/);
  await expect(page.getByRole("status").first()).toContainText("27 streams");
});

test("archive failures, empty results and invalid pages have recovery without losing filters", async ({ page }) => {
  const route = "**/api/streams?*";
  await page.route(route, request => request.fulfill({ status: 503, json: { success: false } }));
  await page.goto("/vods?q=caves&recording=available");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("searchbox", { name: "Search streams" })).toHaveValue("caves");
  await page.unroute(route);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator("main article")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Search streams" }).fill("no-such-stream");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No matching streams" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("searchbox", { name: "Search streams" })).toHaveValue("caves");
  await page.goto("/vods?q=caves&page=999");
  await page.getByRole("button", { name: "Return to first page" }).click();
  await expect(page.locator("main article")).toHaveCount(1);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.getByText(/Filter by date or recording/).click();
  await page.getByLabel("From", { exact: true }).fill("2026-03-29");
  await page.getByLabel("To", { exact: true }).fill("2026-03-29");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/from=2026-03-29&to=2026-03-29/);
  await expect(page.getByRole("heading", { name: "No matching streams" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("chapters open the correct split recording and preserve synchronized chat", async ({ page }) => {
  await fakePlayers(page);
  await page.goto("/vods?q=caves");
  await page.getByRole("link", { name: /Back to the caves/ }).click();
  await page.getByRole("link", { name: /1:10:00.*Wrapping up with chat/ }).click();
  await expect(page).toHaveURL(/\/watch\?t=4200/);
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-video", "fixture01b2");
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-start", "1800");
  await expect(page.getByRole("log")).toContainText("Synthetic expedition message 301");
  await expect(page.getByRole("link", { name: /Open on YouTube/ })).toHaveAttribute("href", /t=1800s/);
  await page.getByRole("link", { name: /30:00.*Deep dives/ }).click();
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-video", "fixture01a1");
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-start", "1800");
  await page.evaluate(() => window.dispatchEvent(new Event("fixture-player-ended")));
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-video", "fixture01b2");
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-start", "0");
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-autoplay", "1");
  await page.reload();
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-video", "fixture01b2");
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-autoplay", "0");
});

test("activity uses readable metrics, preserves gaps and links a selected peak to playback", async ({ page }) => {
  await fakePlayers(page);
  await page.goto("/vods?q=caves");
  await page.getByRole("link", { name: /Back to the caves/ }).click();
  await expect(page.getByRole("combobox", { name: "Activity metric" })).toBeVisible();
  await page.getByRole("combobox", { name: "Activity metric" }).selectOption("viewers");
  await page.getByRole("button", { name: "Go to peak" }).click();
  await expect(page).toHaveURL(/at=2400/);
  await expect(page.getByLabel("Selected activity interval")).toContainText("72");
  const overview = page.url();
  await page.getByRole("link", { name: "Watch from 40:00" }).click();
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-video", "fixture01b2");
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-start", "0");
  const gap = new URL(overview);
  gap.searchParams.set("at", "1500");
  await page.goto(gap.href);
  await expect(page.getByLabel("Selected activity interval")).toContainText("Not recorded");
  await page.getByText("Show interval data", { exact: true }).click();
  await expect(page.getByRole("table")).toContainText("Not recorded");
  await page.getByRole("slider", { name: "Activity interval" }).focus();
  await page.keyboard.press("Home");
  await expect(page.getByLabel("Selected activity interval")).toContainText("20");
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/at=60/);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator("main svg[role=img]")).toBeVisible();
  expect(await page.locator("main svg[role=img]").evaluate(element => element.getBoundingClientRect().width)).toBeLessThan(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test("recording switches and shared links preserve stream time across providers", async ({ page }) => {
  await fakePlayers(page);
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { (window as Window & { copiedLink?: string }).copiedLink = value; } } }));
  await page.goto("/vods?q=Community%20archive%2003");
  await page.locator("main article a").click();
  await page.getByRole("link", { name: "Watch VOD", exact: true }).click();
  await expect(page).toHaveURL(/\/watch\?/);
  const moment = new URL(page.url()); moment.searchParams.set("t", "3000");
  await page.goto(moment.href);
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-video", "v9000000003");
  await page.getByRole("combobox", { name: "Recording source and part" }).selectOption("fixture03b2");
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-start", "600");
  await page.getByRole("button", { name: "Copy moment link", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Copied link to 50:00");
  const copied = new URL((await page.evaluate(() => (window as Window & { copiedLink?: string }).copiedLink))!);
  expect(copied.searchParams.get("t")).toBe("3000");
  expect(copied.searchParams.get("source")).toBe("fixture03b2");
  expect(copied.searchParams.has("returnTo")).toBe(false);
  await page.getByRole("combobox", { name: "Recording source and part" }).selectOption("twitch");
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-start", "3000");
  await page.goBack();
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-video", "fixture03b2");
  await page.goto(copied.href);
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-start", "600");
});

test("uncovered moments and failed players recover honestly with a manual share fallback", async ({ page }) => {
  await page.goto("/vods?q=Community%20archive%2005");
  await page.locator("main article a").click();
  await page.getByRole("link", { name: "Watch VOD", exact: true }).click();
  await expect(page).toHaveURL(/\/watch\?/);
  const moment = new URL(page.url()); moment.searchParams.set("t", "2500");
  await page.goto(moment.href);
  await expect(page.getByRole("heading", { name: "This moment is unavailable" })).toBeVisible();
  await page.getByRole("link", { name: "Watch YouTube part 2 from 50:00" }).click();
  await expect(page.getByRole("button", { name: "Retry player" })).toBeVisible();
  await fakePlayers(page);
  await page.getByRole("button", { name: "Retry player" }).click();
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-start", "0");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Clipboard denied"); } } }));
  await page.getByRole("button", { name: "Copy moment link", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Moment link" })).toHaveValue(/t=3000&source=fixture05b2/);
  moment.searchParams.set("t", "-1");
  await page.goto(moment.href);
  await expect(page.getByText(/Invalid time in this link/)).toBeVisible();
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-video", "fixture05a1");
  await expect(page.getByTestId("fixture-player")).toHaveAttribute("data-start", "0");
});

test("failed activity refresh preserves the selected snapshot and recovers", async ({ page }) => {
  await page.goto("/vods?q=caves");
  await page.locator("main article a").click();
  await page.getByRole("combobox", { name: "Activity metric" }).selectOption("viewers");
  await page.getByRole("button", { name: "Go to peak" }).click();
  await expect(page.getByLabel("Selected activity interval")).toContainText("72");
  const route = "**/api/streams/*/activity";
  await page.route(route, request => request.fulfill({ status: 503, json: { success: false } }));
  await page.getByRole("button", { name: "Refresh activity", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Showing the last loaded snapshot");
  await expect(page.getByLabel("Selected activity interval")).toContainText("72");
  await expect(page).toHaveURL(/at=2400/);
  await page.unroute(route);
  await page.getByRole("button", { name: "Retry activity" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Selected activity interval")).toContainText("72");
  await page.route(route, request => request.fulfill({ json: { success: true, data: { viewerSource: "twitch", intervalMinutes: 1, points: [] } } }));
  await page.getByRole("button", { name: "Refresh activity", exact: true }).click();
  await expect(page.getByText("No timeline is available for this stream yet.")).toBeVisible();
  await page.unroute(route);
  await page.getByRole("button", { name: "Refresh activity", exact: true }).click();
  await expect(page.getByLabel("Selected activity interval")).toContainText("72");
});

test("a player SDK that never becomes ready offers bounded recovery", async ({ page }) => {
  await page.clock.install();
  await page.route("https://www.youtube.com/iframe_api", route => route.fulfill({ contentType: "text/javascript", body: `window.YT={Player:class{constructor(mount){mount.dataset.testid='pending-player'}destroy(){}getCurrentTime(){return 0}}};window.onYouTubeIframeAPIReady();` }));
  await page.goto("/vods?q=caves");
  await page.locator("main article a").click();
  await page.getByRole("link", { name: "Watch VOD", exact: true }).click();
  await expect(page.getByTestId("pending-player")).toBeAttached();
  await page.clock.fastForward(26000);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("did not become ready");
  await expect(page.getByRole("button", { name: "Retry player" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open on YouTube/ })).toHaveAttribute("href", /t=0s/);
});
