import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, request }) => {
  expect(await (await request.get("http://127.0.0.1:33101/health")).json()).toEqual({ success: true, fixture: "vaarattu-browser" });
  await page.route("**/*", route => ["http://127.0.0.1:33101", "http://127.0.0.1:33102"].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
});

test("failed presence history is not an empty history and retries to the saved sessions", async ({ page }) => {
  await page.route("**/api/users/*/sessions", route => route.fulfill({ status: 503, json: { success: false } }));
  await page.goto("/profiles/viewer01/timelines");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByText("No session data available yet.")).toHaveCount(0);
  await page.screenshot({ path: "../work/goal-improvement/clips/timeline-recovery.png" });
  await page.unroute("**/api/users/*/sessions");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("link", { name: "Community night — a synthetic local recording", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await page.goto("/profiles/newviewer/timelines");
  await expect(page.getByText("No session data available yet.")).toBeVisible();
});
