import { test, expect, type Page } from "@playwright/test";

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page, request }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
  expect(await (await request.get("http://127.0.0.1:33101/health")).json()).toEqual({ success: true, fixture: "vaarattu-browser" });
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" && ["33101", "33102"].includes(url.port) ? route.continue() : route.abort();
  });
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test("ranking period follows the URL, refresh, overview and browser history", async ({ page }) => {
  await page.goto("/leaderboards/messages?timeRange=week");
  await expect(page.getByRole("link", { name: "Community Viewer 01", exact: true })).toBeVisible();
  await page.screenshot({ path: "../work/goal-improvement/community/rankings-current.png", fullPage: true });
  await page.getByRole("button", { name: "Past Month", exact: true }).click();
  await expect(page).toHaveURL(/timeRange=month/);
  await page.reload();
  await expect(page.getByRole("button", { name: "Past Month", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Back to Leaderboards", exact: false }).click();
  await expect(page).toHaveURL(/\/leaderboards\?timeRange=month$/);
  await expect(page.getByRole("button", { name: "Past Month", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goBack();
  await expect(page).toHaveURL(/\/messages\?timeRange=month/);
});

test("find a viewer without losing their community rank or category context", async ({ page }) => {
  await page.goto("/leaderboards/messages");
  await page.getByRole("searchbox", { name: "Find a viewer" }).fill("viewer25");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const rankings = page.getByRole("table", { name: "Viewer rankings" });
  await expect(rankings.getByRole("link", { name: "Community Viewer 25", exact: true })).toBeVisible();
  await expect(rankings.getByRole("row").filter({ hasText: "Community Viewer 25" }).getByRole("cell").first()).toHaveText("25");
  await expect(rankings.getByRole("row")).toHaveCount(2);
  await expect(page.getByText("Ranks stay relative to the full leaderboard.")).toBeVisible();
  await page.getByRole("navigation", { name: "Leaderboard categories" }).getByRole("link", { name: "Gifted Subs", exact: true }).click();
  await expect(page).toHaveURL(/\/gifts\?search=viewer25/);
  await expect(rankings.getByRole("link", { name: "Community Viewer 25", exact: true })).toBeVisible();
  await rankings.getByRole("link", { name: "Community Viewer 25", exact: true }).click();
  await expect(page).toHaveURL(/\/profiles\/viewer25$/);
  await page.goBack();
  await expect(page.getByRole("searchbox", { name: "Find a viewer" })).toHaveValue("viewer25");
  await page.reload();
  await expect(rankings.getByRole("row")).toHaveCount(2);
});

test("viewer lookup recovers without losing the name and supports empty and stale pages", async ({ page }) => {
  await page.route("**/api/leaderboards/users?*", route => route.fulfill({ status: 503, json: { success: false } }));
  await page.goto("/leaderboards/messages?timeRange=week&search=viewer01");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Failed to load leaderboard");
  await expect(page.getByRole("searchbox", { name: "Find a viewer" })).toHaveValue("viewer01");
  await page.unroute("**/api/leaderboards/users?*");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("table", { name: "Viewer rankings" }).getByRole("row")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Find a viewer" }).fill("absent-viewer");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No matching viewers" })).toBeVisible();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByRole("table", { name: "Viewer rankings" }).getByRole("row")).toHaveCount(3);
  await page.goto("/leaderboards/messages?timeRange=week&page=99");
  await page.getByRole("button", { name: "Go to first page" }).click();
  await expect(page).toHaveURL(/\/messages\?timeRange=week$/);
  await page.goto("/leaderboards/messages?timeRange=unknown&page=-1");
  await expect(page.getByRole("button", { name: "All Time", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("table", { name: "Viewer rankings" }).getByRole("row")).toHaveCount(26);
});

test("reward and emote pages retain period, platform and pagination through refresh", async ({ page }) => {
  await page.goto("/leaderboards/emotes?timeRange=week");
  await page.getByRole("button", { name: "BetterTTV", exact: true }).click();
  await expect(page).toHaveURL(/timeRange=week&platform=bttv/);
  await page.reload();
  await expect(page.getByRole("button", { name: "BetterTTV", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("navigation", { name: "Leaderboard categories" }).getByRole("link", { name: "Rewards", exact: true }).click();
  await expect(page.getByRole("button", { name: "Past Week", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: /Choose the next game/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Past Month", exact: true }).click();
  await expect(page).toHaveURL(/timeRange=month$/);
  await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/leaderboards/rewards");
  await page.getByRole("combobox", { name: "Period", exact: true }).selectOption("month");
  await page.getByRole("combobox", { name: "Category", exact: true }).selectOption("messages");
  await expect(page).toHaveURL(/messages\?timeRange=month$/);
});

test("profile entry and populated rankings work on narrow screens and keyboard", async ({ page }) => {
  await page.goto("/profiles/viewer25");
  await page.getByRole("link", { name: "View Rankings", exact: true }).click();
  await expect(page).toHaveURL(/\/messages\?search=viewer25/);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByRole("table", { name: "Viewer rankings" }).getByRole("row")).toHaveCount(26);
  for (const width of [1366, 768, 375, 320]) {
    await page.setViewportSize({ width, height: width > 768 ? 900 : 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `../work/goal-improvement/community/rankings-${width}.png`, fullPage: width === 320 });
  }
  await page.getByRole("searchbox", { name: "Find a viewer" }).fill("viewer25");
  await page.getByRole("searchbox", { name: "Find a viewer" }).press("Enter");
  await expect(page.getByRole("table", { name: "Viewer rankings" }).getByRole("row")).toHaveCount(2);
  await page.screenshot({ path: "../work/goal-improvement/community/lookup-mobile.png" });
  await page.getByRole("combobox", { name: "Period", exact: true }).selectOption("week");
  await page.getByRole("combobox", { name: "Category", exact: true }).selectOption("gifts");
  await expect(page).toHaveURL(/gifts\?timeRange=week&search=viewer25/);
  await expect(page.getByRole("table", { name: "Viewer rankings" }).getByRole("row")).toHaveCount(2);
});

test("adjacent profile and reward journeys remain readable with long content and enlarged text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.route("**/api/users/login/viewer25", async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.displayName = "VeryLongCommunityViewer25";
    body.data.aiSummary = "A community biography with a long reference: https://example.test/" + "recording".repeat(15);
    await route.fulfill({ response, json: body });
  });
  await page.goto("/profiles/viewer25");
  await expect(page.getByRole("heading", { name: "VeryLongCommunityViewer25", exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.evaluate(() => document.documentElement.style.fontSize = "200%");
  await page.screenshot({ path: "../work/goal-improvement/community/profile-text-scale.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.goto("/leaderboards/rewards");
  await expect(page.getByRole("link", { name: /Choose the next game/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.screenshot({ path: "../work/goal-improvement/community/rewards-mobile.png", fullPage: true });
});
