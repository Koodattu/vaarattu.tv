import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:33102", timezoneId: "Europe/Helsinki", trace: "retain-on-failure" },
  webServer: [
    {
      command: "node ../backend/web/tests/browser-server.cjs",
      url: "http://127.0.0.1:33101/health",
      env: { VOD_TEST_DATABASE_URL: "postgresql://postgres@127.0.0.1:55489/postgres" },
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 33102",
      url: "http://127.0.0.1:33102/profiles",
      env: { NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:33101", NEXT_TELEMETRY_DISABLED: "1" },
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    },
  ],
});
