import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "foundation-desktop.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: "line",
  globalSetup: "./tests/setup/playwright.ts",
  use: {
    headless: true,
    offline: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
