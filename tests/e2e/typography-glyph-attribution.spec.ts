import { type Browser, type Page, test, type TestInfo } from "@playwright/test";
import { collectSpanishGlyphAttributions } from "./typography-glyph-attribution";

test("attributes every canonical Spanish glyph to its DIBS face in Chromium", async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== "chromium",
    "Rendered font attribution uses Chromium DevTools Protocol.",
  );
  await captureGlyphEvidence({ page, browser, browserName, testInfo });
});

type GlyphEvidenceContext = Readonly<{
  page: Page;
  browser: Browser;
  browserName: string;
  testInfo: TestInfo;
}>;

async function captureGlyphEvidence(
  { page, browser, browserName, testInfo }: GlyphEvidenceContext,
): Promise<void> {
  await page.goto("/dev-fixtures/typography-proportional-pair/");
  await page.evaluate(() => document.fonts.ready);
  const attributions = await collectSpanishGlyphAttributions(page);

  await testInfo.attach("spanish-font-attribution.json", {
    body: JSON.stringify(
      {
        browser: { name: browserName, version: browser.version() },
        attributions,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
}
