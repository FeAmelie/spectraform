import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "foundation-desktop.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: "line",
  outputDir:
    process.env.SPECTRAFORM_PLAYWRIGHT_OUTPUT_DIR ??
    join(tmpdir(), `spectraform-playwright-results-${process.pid}`),
  globalSetup: "./tests/setup/playwright.ts",
  use: {
    headless: true,
    offline: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
