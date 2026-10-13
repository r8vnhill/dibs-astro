import { expect, test } from "@playwright/test";
import {
  assertChromiumClipboardText,
  assertRepresentativeSelectionText,
  readFirefoxClipboardOutcome,
} from "./typography-source-preservation";

const fixturePath = "/dev-fixtures/typography-proportional-pair/";

test.beforeEach(async ({ page }) => {
  await page.goto(fixturePath);
  await page.evaluate(() => document.fonts.ready);
});

test("preserves canonical sequences in DOM selection across feature modes", async ({
  page,
}, testInfo) => {
  const cases = await assertRepresentativeSelectionText(page);
  await testInfo.attach("source-selection-result.json", {
    body: JSON.stringify({ status: "verified", cases }),
    contentType: "application/json",
  });
});

test("copies the selected source text through the Chromium clipboard", async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "Clipboard permission checks use Chromium.");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const cases = await assertChromiumClipboardText(page);
  await testInfo.attach("chromium-clipboard-result.json", {
    body: JSON.stringify({ status: "verified", cases, version: browser.version() }, null, 2),
    contentType: "application/json",
  });
});

test("records Firefox clipboard support without assuming permission", async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "firefox", "Firefox clipboard behavior is recorded separately.");
  const outcome = await readFirefoxClipboardOutcome(page);

  await testInfo.attach("firefox-clipboard-outcome.json", {
    body: JSON.stringify({ ...outcome, version: browser.version() }, null, 2),
    contentType: "application/json",
  });
  expect(outcome.status, outcome.detail).not.toBe("failed");
});
