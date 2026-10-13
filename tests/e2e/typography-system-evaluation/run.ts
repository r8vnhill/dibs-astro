/** Orchestrates font checks, viewport captures, and diagnostic artifacts for a browser test. */
import { type Browser, expect, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import {
  productionFontStylesheetUrl,
} from "../../../src/lib/typography/production-font-stylesheet";
import { captureViewportReview, reviewViewports } from "./capture";
import {
  assertFontResources,
  assertRequiredFacesLoaded,
  loadRequiredFaces,
  watchFontResources,
} from "./font-loading";
import { readRenderedCodeFonts, readSourceRevision } from "./metrics";

const fixturePath = "/dev-fixtures/typography-proportional-pair/";

/** Checks font sources, then records layout and screenshot evidence at each viewport. */
export async function runTypographySystemEvaluation(
  page: Page,
  browser: Browser,
  testInfo: TestInfo,
): Promise<void> {
  const tracker = watchFontResources(page);
  const useChromiumCdp = browser.browserType().name() === "chromium";
  await loadFixtureFonts(page);
  const faces = await loadRequiredFaces(page);
  assertRequiredFacesLoaded(faces);
  await assertFontResources(page, tracker, faces);
  await attachFontDiagnostics(testInfo, tracker, faces, page, useChromiumCdp);
  const metrics = await captureAllViewports(page, testInfo, tracker, faces, useChromiumCdp);
  await writeSystemMetrics(testInfo, browser, tracker, metrics);
}

async function loadFixtureFonts(page: Page): Promise<void> {
  await page.goto(fixturePath);
  await expect(page.locator("link[rel=\"stylesheet\"][href]")).toHaveAttribute(
    "href",
    productionFontStylesheetUrl,
  );
}

async function attachFontDiagnostics(
  testInfo: TestInfo,
  tracker: ReturnType<typeof watchFontResources>,
  faces: Awaited<ReturnType<typeof loadRequiredFaces>>,
  page: Page,
  useChromiumCdp: boolean,
): Promise<void> {
  const rendered = useChromiumCdp ? await readRenderedCodeFonts(page) : null;
  if (rendered) {
    expect(rendered.firaGlyphCount, "Fira Code renders the code specimen").toBeGreaterThan(0);
  }
  await testInfo.attach("typography-system-font-diagnostics.json", {
    body: JSON.stringify(fontDiagnostics(tracker, faces, rendered), null, 4),
    contentType: "application/json",
  });
}

const fontDiagnostics = (
  tracker: ReturnType<typeof watchFontResources>,
  faces: Awaited<ReturnType<typeof loadRequiredFaces>>,
  rendered: Awaited<ReturnType<typeof readRenderedCodeFonts>> | null,
) => ({
  stylesheetUrl: productionFontStylesheetUrl,
  stylesheetStatus: tracker.stylesheetStatus,
  faces,
  fontResponses: tracker.responses,
  failedFontRequests: tracker.failedRequests,
  attributionMethod: rendered ? "chromium-cdp" : "computed-style",
  platformFonts: rendered?.fonts ?? null,
  firaGlyphCount: rendered?.firaGlyphCount ?? null,
})

async function captureAllViewports(
  page: Page,
  testInfo: TestInfo,
  tracker: ReturnType<typeof watchFontResources>,
  faces: Awaited<ReturnType<typeof loadRequiredFaces>>,
  useChromiumCdp: boolean,
) {
  const metrics = [];
  for (const viewport of reviewViewports) {
    const capture = await captureViewportReview(page, viewport, testInfo, useChromiumCdp);
    metrics.push({ ...capture, faces, ...fontResourceEvidence(tracker) });
  }
  return metrics;
}

const fontResourceEvidence = (tracker: ReturnType<typeof watchFontResources>) => ({
  expectedFontResourceOrigins: {
    dibsSans: "same-origin /fonts/dibs-sans/*.woff2",
    dibsSlab: "same-origin /fonts/dibs-slab/*.woff2",
    interReference: "same-origin /dev-fixtures/fonts/inter-4.1/*.woff2",
    spaceGroteskReference: "same-origin /dev-fixtures/fonts/space-grotesk-2.0.0/*.woff2",
    firaCode:
      "production fonts.googleapis.com stylesheet and fonts.gstatic.com /s/firacode/*.woff2",
  },
  observedFontResources: tracker.responses.map((response) => ({
    ...response,
    origin: new URL(response.url).origin,
    path: new URL(response.url).pathname,
  })),
  fontResponses: tracker.responses,
});

async function writeSystemMetrics(
  testInfo: TestInfo,
  browser: Browser,
  tracker: ReturnType<typeof watchFontResources>,
  metrics: Awaited<ReturnType<typeof captureAllViewports>>,
): Promise<void> {
  const report = await buildSystemReport(browser, tracker, metrics);
  await writeFile(
    testInfo.outputPath("typography-system-metrics.json"),
    `${JSON.stringify(report, null, 4)}\n`,
    "utf8",
  );
}

const buildSystemReport = async (
  browser: Browser,
  tracker: ReturnType<typeof watchFontResources>,
  metrics: Awaited<ReturnType<typeof captureAllViewports>>,
) => ({
  sourceRevision: await readSourceRevision(),
  browser: { name: browser.browserType().name(), version: browser.version() },
  executionEnvironment: {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
  },
  externalFontDependency: productionFontStylesheetUrl,
  stylesheetStatus: tracker.stylesheetStatus,
  failedFontRequests: tracker.failedRequests,
  viewports: metrics,
});
