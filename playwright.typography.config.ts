import { defineConfig, devices } from "@playwright/test";
import { resolvePlaywrightTarget } from "./tests/e2e/playwright-target";

const target = resolvePlaywrightTarget(
  process.env.CONTAINER_BASE_URL,
  Boolean(process.env.CI),
);

/** Isolated cross-browser harness for browser-based typography evaluation. */
export const typographyPlaywrightConfig = defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/typography-*.spec.ts",
  fullyParallel: true,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["dot"], ["html", { outputFolder: "playwright-report-typography", open: "never" }]]
    : "list",
  outputDir: "test-results-typography",
  use: {
    baseURL: target.baseURL,
    trace: "on-first-retry",
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  ...(target.webServer ? { webServer: target.webServer } : {}),
});

export default typographyPlaywrightConfig;
