import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

if (process.env.DOTENV_CONFIG_PATH) {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH });
} else {
  dotenv.config({ path: ".env.local" });
  dotenv.config();
}

export default defineConfig({
  testDir: "./scripts/qa/__tests__",
  testMatch: "**/*.spec.ts",
  timeout: 180000,
  expect: {
    timeout: 30000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    storageState: "playwright/.auth/admin.json",
  },
  globalSetup: require.resolve("./scripts/qa/global-setup.ts"),
  webServer: {
    command: "npm run dev",
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
