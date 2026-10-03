import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, request }) => {
  const health = await request.get("http://127.0.0.1:33101/health");
  expect(await health.json()).toEqual({ success: true, fixture: "vaarattu-browser" });
  // No requests to live Twitch, image CDNs or other external integrations.
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" && ["33101", "33102"].includes(url.port) ? route.continue() : route.abort();
  });
});

test("home embeds hydrate with the local hostname and community journeys remain navigable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator('iframe[title="vaarattu\'s Twitch Stream"]')).toHaveAttribute("src", /parent=127\.0\.0\.1/);
  await expect(page.locator('iframe[title="vaarattu\'s Twitch Chat"]')).toHaveAttribute("src", /parent=127\.0\.0\.1/);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Leaderboards", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Leaderboards", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Community Viewer 01", exact: true }).first()).toBeVisible();
  for (const category of ["messages", "watchtime", "points", "gifts", "cheers"]) {
    await page.goto(`/leaderboards/${category}`);
    await expect(page.getByRole("link", { name: /Community Viewer/ })).toHaveCount(25);
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Past Week", exact: true }).click();
    await expect(page.getByRole("button", { name: "Past Week", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Community Viewer 01", exact: true })).toBeVisible();
  }
  await page.getByRole("link", { name: "Community Viewer 01", exact: true }).click();
  await page.getByRole("link", { name: "View Timelines", exact: true }).click();
  await expect(page.getByText("Community night — a synthetic local recording", { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("VOD browsing exposes activity, viewer filtering and an honest unavailable recording state", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/vods");
  await page.getByRole("link", { name: /Community night — a synthetic local recording/ }).click();
  await expect(page.getByRole("heading", { name: "Community night — a synthetic local recording", exact: true })).toBeVisible();
  await expect(page.getByText("Unique viewers", { exact: true })).toBeVisible();
  const detailURL = page.url();
  await page.getByRole("link", { name: "View Timeline", exact: true }).click();
  await page.getByPlaceholder("Search viewers...").fill("absent-viewer");
  await expect(page.getByText(/No viewers matching/)).toBeVisible();
  await page.goto(detailURL);
  await page.getByRole("link", { name: "Watch VOD", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recording unavailable", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  expect(errors).toEqual([]);
});

test("profile search stops at the last page and survives a profile round trip", async ({ page }) => {
  await page.goto("/profiles");
  await page.locator("input").fill("Community");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("link", { name: /Community Viewer/ })).toHaveCount(25);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: /Community Viewer 01/ }).click();
  await expect(page).toHaveURL(/\/profiles\/viewer01$/);
  await page.goBack();
  await expect(page.getByRole("searchbox", { name: "Search viewers" })).toHaveValue("Community");
  await expect(page.getByRole("link", { name: /Community Viewer/ })).toHaveCount(25);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: "../work/goal-improvement/profiles-mobile.png", fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test("leaderboards stop at the server's last page and emote filtering shows all matching ranks", async ({ page }) => {
  await page.goto("/leaderboards/messages");
  await expect(page.getByRole("link", { name: /Community Viewer/ })).toHaveCount(25);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.goto("/leaderboards/emotes");
  await page.getByRole("button", { name: "BetterTTV", exact: true }).click();
  await expect(page.getByText("GameNight03", { exact: true })).toBeVisible();
  await expect(page.getByText("GameNight27", { exact: true })).toBeVisible();
  await expect(page.getByText("GameNight01", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "BetterTTV", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: "../work/goal-improvement/emotes-mobile.png", fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test("reward rankings expose every redeemer and link to usable new viewer profiles", async ({ page }) => {
  await page.goto("/leaderboards/rewards");
  await page.getByRole("link", { name: /Choose the next game/ }).click();
  await expect(page.getByRole("heading", { name: "Choose the next game", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("link", { name: "New Viewer", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "New Viewer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "New Viewer", exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "View Chat History", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No messages found", exact: true })).toBeVisible();
});

test("leaderboard overview preserves successful results and retries failed reward rankings", async ({ page }) => {
  await page.goto("/leaderboards");
  await expect(page.getByRole("heading", { name: "Reward Champions", exact: true })).toBeVisible();
  const rewardRoute = "**/api/leaderboards/rewards/all?timeRange=week";
  await page.route(rewardRoute, route => route.fulfill({ status: 503, json: { success: false } }));
  await page.getByRole("button", { name: "Past Week", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Most Messages/ })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Unable to load reward rankings");
  await expect(page.getByText("Choose the next game", { exact: true })).toHaveCount(1);
  await page.unroute(rewardRoute);
  await page.getByRole("button", { name: "Retry rewards", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("Choose the next game", { exact: true })).toHaveCount(2);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("chat history loads one page, searches and recovers without losing input", async ({ page }) => {
  await page.goto("/profiles/viewer01/chat-history");
  await expect(page.getByText("Synthetic chat message 1000", { exact: true })).toBeVisible();
  await expect(page.locator("main li")).toHaveCount(100);
  await page.getByRole("button", { name: "Older messages", exact: true }).click();
  await expect(page.getByText("Synthetic chat message 0900", { exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search messages", exact: true }).fill("welcome");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator("main li")).toHaveCount(100);
  await expect(page.getByRole("button", { name: "Older messages", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Newer messages", exact: true })).toBeDisabled();
  const fail = async (route: import("@playwright/test").Route) => route.fulfill({ status: 503, json: { success: false, error: "Fixture unavailable" } });
  await page.route("**/api/mod/users/*/messages?**", fail);
  await page.getByRole("searchbox", { name: "Search messages", exact: true }).fill("message 0001");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search messages", exact: true })).toHaveValue("message 0001");
  await page.unroute("**/api/mod/users/*/messages?**", fail);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator("main li")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator("main li")).toHaveCount(100);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: "../work/goal-improvement/chat-mobile.png", fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test("older chat pages group messages by local date, including midnight", async ({ page }) => {
  await page.goto("/profiles/viewer01/chat-history");
  await expect(page.getByText("Synthetic chat message 1000", { exact: true })).toBeVisible();
  for (const lastMessage of [900, 800, 700, 600, 500, 400, 300, 200, 100]) {
    await page.getByRole("button", { name: "Older messages", exact: true }).click();
    await expect(page.getByText(`Synthetic chat message ${String(lastMessage).padStart(4, "0")}`, { exact: true })).toBeVisible();
  }
  await expect(page.locator("main section")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Older messages", exact: true })).toBeDisabled();
});

test("profile search ignores obsolete responses and recovers from empty results", async ({ page }) => {
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  let requested!: () => void;
  const pending = new Promise<void>(resolve => { requested = resolve; });
  await page.route("**/api/users?*search=viewer01", async route => {
    const response = await route.fetch();
    requested();
    await delayed;
    await route.fulfill({ response });
  });
  await page.goto("/profiles");
  await page.getByRole("searchbox", { name: "Search viewers" }).fill("viewer01");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await pending;
  await page.getByRole("searchbox", { name: "Search viewers" }).fill("viewer02");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("link", { name: /Community Viewer 02/ })).toBeVisible();
  release();
  await expect(page.getByRole("link", { name: /Community Viewer 01/ })).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search viewers" }).fill("not-a-viewer");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No viewers found" })).toBeVisible();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByRole("button", { name: "Refresh selection", exact: true })).toBeEnabled();
  await expect(page.getByRole("link", { name: /Community Viewer/ }).first()).toBeVisible();
});

test("dark shell remains readable in light mode and navigation fits a narrow screen", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/profiles/viewer01");
  await expect(page.getByRole("heading", { name: "Community Viewer 01", exact: true }).first()).toBeVisible();
  const bodyBackground = await page.locator("body").evaluate(element => getComputedStyle(element).backgroundColor);
  expect(bodyBackground).not.toBe("rgb(255, 255, 255)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Profiles", exact: true })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.screenshot({ path: "../work/goal-improvement/shell-mobile.png", fullPage: true });
});
