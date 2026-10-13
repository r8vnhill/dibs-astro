/**
 * Capture the combined lesson specimen after using the site's real light/dark theme control.
 *
 * These checks cover palette changes, responsive layout, and stable font assignments. The captures
 * provide maintainers and students with browser evidence without assigning a visual verdict.
 */
import { expect, type Page, test, type TestInfo } from "@playwright/test";
import { reviewViewports } from "./typography-system-evaluation/capture";

const fixturePath = "/dev-fixtures/typography-proportional-pair/";
const themes = ["light", "dark"] as const;

type ThemeCapture = Readonly<{
  theme: (typeof themes)[number];
  viewport: string;
  width: number;
  height: number;
  background: string;
  foreground: string;
  border: string;
  fonts: readonly string[];
  documentWidth: number;
  viewportWidth: number;
  codeClientWidth: number;
  codeScrollWidth: number;
}>;

test("keeps typography assignments stable across themes and review viewports", async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  await page.goto(fixturePath);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: screenshotStabilizers });
  const captures = await collectThemeCaptures(page, testInfo);

  await testInfo.attach("theme-viewport-metrics.json", {
    body: JSON.stringify(
      {
        browser: { name: browserName, version: browser.version() },
        captures,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

async function collectThemeCaptures(page: Page, testInfo: TestInfo): Promise<ThemeCapture[]> {
  const captures: ThemeCapture[] = [];
  for (const theme of themes) {
    await selectTheme(page, theme);
    for (const viewport of reviewViewports) {
      captures.push(await captureThemeViewport(page, theme, viewport, testInfo));
    }
  }
  return captures;
}

async function selectTheme(page: Page, theme: (typeof themes)[number]): Promise<void> {
  const trigger = page.locator("[data-theme-trigger]");
  await trigger.click();
  await page.locator(`[data-theme-value="${theme}"]`).click();
  if (theme === "dark") {
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  } else {
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  }
  await expect(page.locator("[data-theme-options]")).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBe(theme);
}

async function captureThemeViewport(
  page: Page,
  theme: (typeof themes)[number],
  viewport: (typeof reviewViewports)[number],
  testInfo: TestInfo,
): Promise<ThemeCapture> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.evaluate(() => document.fonts.ready);
  const before = await readFontAssignments(page);
  const capture = await readThemeLayout(page, theme, viewport.name);
  const fileName = `typography-${theme}-${viewport.name}.png`;
  await captureThemeScreenshot(page, testInfo.outputPath(fileName));
  expect(await readFontAssignments(page), `${theme}/${viewport.name}/fonts`).toEqual(before);
  return {
    theme,
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    fonts: before,
    ...capture,
  };
}

async function captureThemeScreenshot(page: Page, path: string): Promise<void> {
  await page.locator("[data-visual-review='three-role-system']").screenshot({
    path,
    animations: "disabled",
    caret: "hide",
  });
}

const readFontAssignments = async (page: Page): Promise<string[]> =>
  page.locator("[data-visual-review='three-role-system'] [data-typography-role]")
    .evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      return [style.fontFamily, style.fontWeight, style.fontStyle].join("|");
    }));

async function readThemeLayout(
  page: Page,
  theme: (typeof themes)[number],
  viewport: string,
) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const guide = document.querySelector<HTMLElement>(".fixture-guide");
    const code = document.querySelector<HTMLElement>("pre[data-typography-role='code-block']");
    if (!guide || !code) throw new Error("The guide or code specimen is missing.");
    const bodyStyle = getComputedStyle(document.body);
    return {
      background: bodyStyle.backgroundColor,
      foreground: bodyStyle.color,
      border: getComputedStyle(guide).borderTopColor,
      documentWidth: root.scrollWidth,
      viewportWidth: root.clientWidth,
      codeClientWidth: code.clientWidth,
      codeScrollWidth: code.scrollWidth,
    };
  });
  assertThemeLayout(result, theme, viewport);
  return result;
}

function assertThemeLayout(
  result: Awaited<ReturnType<typeof readThemeLayout>>,
  theme: (typeof themes)[number],
  viewport: string,
): void {
  const label = `${theme}/${viewport}`;
  expect(result.documentWidth, `${label}/page overflow`)
    .toBeLessThanOrEqual(result.viewportWidth + 1);
  expect(result.background, `${label}/surface`).not.toBe("rgba(0, 0, 0, 0)");
  expect(result.foreground, `${label}/text`).not.toBe(result.background);
  expect(result.border, `${label}/border`).not.toBe(result.background);
  expect(result.codeScrollWidth, `${label}/code clipping`)
    .toBeGreaterThanOrEqual(result.codeClientWidth);
  if (viewport === "mobile") {
    expect(result.codeScrollWidth, `${label}/code can scroll`)
      .toBeGreaterThan(result.codeClientWidth);
  }
}

const screenshotStabilizers = `
  *, *::before, *::after {
    animation: none !important;
    caret-color: transparent !important;
    transition: none !important;
  }
`;
