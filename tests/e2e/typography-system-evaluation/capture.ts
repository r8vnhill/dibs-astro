/** Browser measurements and screenshots for one viewport of the combined typography specimen. */
import { expect, type Page, type TestInfo } from "@playwright/test";
import { readLayout, readRenderedCodeFonts, readRoleStyles } from "./metrics";

export const reviewViewports = [
  { name: "desktop", width: 1600, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

type ReviewViewport = (typeof reviewViewports)[number];

export type ViewportReviewCapture = {
  viewport: ReviewViewport & { deviceScaleFactor: number };
  roles: Awaited<ReturnType<typeof readRoleStyles>>;
  platformFontUsage: Awaited<ReturnType<typeof readRenderedCodeFonts>> | null;
  platformFontAttribution: "chromium-cdp" | "computed-style";
  layout: Awaited<ReturnType<typeof readLayout>>;
};

const reviewSelector = "[data-visual-review=\"three-role-system\"]";
const expectedSource = "// Conventional function arguments\n"
  + "list\n    .filter({ x -> x > 10 })\n    .map({ x -> x * 2 })\n\n"
  + "// Trailing lambdas\n"
  + "list\n    .filter { x -> x > 10 }\n    .map { x -> x * 2 }";

export async function captureViewportReview(
  page: Page,
  viewport: ReviewViewport,
  testInfo: TestInfo,
  useChromiumCdp: boolean,
): Promise<ViewportReviewCapture> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.evaluate(() => document.fonts.ready);
  const [roles, layout] = await Promise.all([
    readRoleStyles(page),
    readLayout(page),
  ]);
  const platformFontUsage = useChromiumCdp ? await readRenderedCodeFonts(page) : null;
  assertCaptureContract(roles, layout, platformFontUsage, viewport.name);
  await expect(page.locator(reviewSelector)).toBeVisible();
  await captureScreenshot(page, testInfo, viewport.name);
  return {
    viewport: { ...viewport, deviceScaleFactor: layout.deviceScaleFactor },
    roles,
    platformFontUsage,
    platformFontAttribution: useChromiumCdp ? "chromium-cdp" : "computed-style",
    layout,
  };
}

function assertCaptureContract(
  roles: Awaited<ReturnType<typeof readRoleStyles>>,
  layout: Awaited<ReturnType<typeof readLayout>>,
  platformFonts: Awaited<ReturnType<typeof readRenderedCodeFonts>> | null,
  viewportName: string,
): void {
  assertViewportLayout(layout, viewportName);
  assertRoleFontStyles(roles, layout.readingRegion, viewportName);
  assertCodeFontAndSource(layout, platformFonts?.firaGlyphCount, viewportName);
}

async function captureScreenshot(
  page: Page,
  testInfo: TestInfo,
  viewportName: string,
): Promise<void> {
  await page.locator(reviewSelector).screenshot({
    path: testInfo.outputPath(`typography-system-${viewportName}.png`),
    animations: "disabled",
    caret: "hide",
  });
}

function assertViewportLayout(layout: Awaited<ReturnType<typeof readLayout>>, name: string): void {
  expect(layout.documentWidth, `${name}/document width`)
    .toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.readingRegion.left, `${name}/reading region left`).toBeGreaterThanOrEqual(-1);
  expect(layout.readingRegion.right, `${name}/reading region right`)
    .toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.readingRegion.scrollWidth, `${name}/reading region content`)
    .toBeLessThanOrEqual(layout.readingRegion.clientWidth + 1);
}

function assertRoleFontStyles(
  roles: Awaited<ReturnType<typeof readRoleStyles>>,
  region: Awaited<ReturnType<typeof readLayout>>["readingRegion"],
  viewportName: string,
): void {
  for (const role of roles) assertRoleFontStyle(role, region, viewportName);
}

function assertRoleFontStyle(
  role: Awaited<ReturnType<typeof readRoleStyles>>[number],
  region: Awaited<ReturnType<typeof readLayout>>["readingRegion"],
  viewportName: string,
): void {
  expect(role.observedFamily, `${viewportName}/${role.id}/family`).toContain(role.expectedFamily);
  expect(role.weight, `${viewportName}/${role.id}/weight`).toBe(role.expectedWeight);
  expect(role.style, `${viewportName}/${role.id}/style`).toBe(role.expectedStyle);
  expect(role.synthesis, `${viewportName}/${role.id}/synthesis`).toBe("none");
  expect(role.left, `${viewportName}/${role.id}/left`).toBeGreaterThanOrEqual(region.left - 1);
  expect(role.right, `${viewportName}/${role.id}/right`).toBeLessThanOrEqual(region.right + 1);
}

function assertCodeFontAndSource(
  layout: Awaited<ReturnType<typeof readLayout>>,
  firaGlyphCount: number | undefined,
  viewportName: string,
): void {
  expect(layout.codeBlock.overflowX, `${viewportName}/code scrolling`).toBe("auto");
  if (firaGlyphCount !== undefined) {
    expect(firaGlyphCount, `${viewportName}/Fira Code glyph count`).toBeGreaterThan(0);
  }
  expect(layout.sourceText).toBe(expectedSource);
  if (viewportName === "mobile") assertMobileCodeScroll(layout.codeBlock);
}

function assertMobileCodeScroll(code: Awaited<ReturnType<typeof readLayout>>["codeBlock"]): void {
  expect(code.scrollWidth, "mobile code is horizontally scrollable")
    .toBeGreaterThan(code.clientWidth);
}
