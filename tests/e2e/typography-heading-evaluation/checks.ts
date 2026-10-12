/** Heading loading, parity, layout, and capture checks for the typography fixture. */
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import {
  headingEvaluationCases,
  headingEvaluationFamilies,
} from "../../../src/lib/typography/heading-font-evaluation-fixture";
import {
  readFontResourcePaths,
  readLoadedFonts,
  recordFontRequests,
  unexpectedExternalFontRequests,
  waitForEvaluationFonts,
} from "../typography-evaluation-common";
import { isProductionFiraCodeFontResource } from "../typography-font-resource-policy";

const fixturePath = "/dev-fixtures/typography-proportional-pair/";
const reviewSelector = "[data-visual-review=\"heading-font-comparison\"]";
type HeadingFamily = (typeof headingEvaluationFamilies)[number];
type HeadingCase = (typeof headingEvaluationCases)[number];

export async function verifyHeadingFonts(page: Page): Promise<void> {
  const requests = recordFontRequests(page);
  await page.goto(fixturePath);
  await waitForEvaluationFonts(page);
  assertApprovedFontRequests(requests, new URL(page.url()).origin);
  const families = headingEvaluationFamilies.map(({ cssFamily }) => cssFamily);
  assertHeadingFaces(await readLoadedFonts(page, families));
  assertHeadingResources(await readFontResourcePaths(page));
}

export async function verifyHeadingParity(page: Page): Promise<void> {
  await page.goto(fixturePath);
  await waitForEvaluationFonts(page);
  for (const evaluationCase of headingEvaluationCases) {
    await assertHeadingPair(page, evaluationCase);
  }
}

export async function verifyHeadingLayout(page: Page, testInfo: TestInfo): Promise<void> {
  const metrics = [];
  for (const viewport of reviewViewports) {
    const result = await collectHeadingMetrics(page, viewport);
    assertHeadingLayout(result, viewport.name);
    metrics.push(result);
  }
  await writeHeadingMetrics(testInfo, metrics);
}

export async function captureHeadingReview(
  page: Page,
  testInfo: TestInfo,
  viewport: (typeof reviewViewports)[number],
): Promise<void> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(fixturePath);
  await waitForEvaluationFonts(page);
  await captureHeadingScreenshots(page, testInfo, viewport.name);
}

function assertApprovedFontRequests(requests: readonly string[], pageOrigin: string): void {
  const unexpected = unexpectedExternalFontRequests(requests, pageOrigin)
    .filter((url) => !isProductionFiraCodeFontResource(url));
  expect(unexpected).toEqual([]);
}

function assertHeadingFaces(faces: Awaited<ReturnType<typeof readLoadedFonts>>): void {
  for (const family of headingEvaluationFamilies) {
    for (const state of family.states) {
      const loadedFace = faces.find((face) =>
        face.family === family.cssFamily
        && face.style === state.style
        && face.weight === String(state.weight)
      );
      expect(loadedFace).toEqual({
        family: family.cssFamily,
        style: state.style,
        status: "loaded",
        weight: String(state.weight),
      });
    }
  }
}

function assertHeadingResources(paths: readonly string[]): void {
  expect(paths.filter((path) => path.includes("/fonts/dibs-slab/")).length).toBe(2);
  expect(paths.filter((path) => path.includes("/dev-fixtures/fonts/space-grotesk-2.0.0/")).length)
    .toBe(2);
}

async function assertHeadingPair(page: Page, evaluationCase: HeadingCase): Promise<void> {
  const computed = await Promise.all(headingEvaluationFamilies.map((family) =>
    readComputedSpecimen(specimenLocator(page, evaluationCase, family))));
  const [candidate, reference] = computed;
  expect(candidate?.tagName, evaluationCase.id).toBe(evaluationCase.semanticLevel.toUpperCase());
  expect(reference?.tagName, evaluationCase.id).toBe(candidate?.tagName);
  expect(candidate?.source, `${evaluationCase.id}/source`).toBe(evaluationCase.text);
  expect(reference?.source, `${evaluationCase.id}/source`).toBe(candidate?.source);
  assertHeadingFamilies(candidate, reference, evaluationCase.id);
  assertHeadingTypography(candidate, reference, evaluationCase);
}

function assertHeadingFamilies(
  candidate: Awaited<ReturnType<typeof readComputedSpecimen>>,
  reference: Awaited<ReturnType<typeof readComputedSpecimen>>,
  caseId: string,
): void {
  expect(candidate?.family, `${caseId}/candidate-family`).toContain("DIBS Slab");
  expect(reference?.family, `${caseId}/reference-family`)
    .toContain("Space Grotesk Reference 2.0.0");
}

function assertHeadingTypography(
  candidate: Awaited<ReturnType<typeof readComputedSpecimen>>,
  reference: Awaited<ReturnType<typeof readComputedSpecimen>>,
  evaluationCase: HeadingCase,
): void {
  const expected = {
    weight: String(evaluationCase.representativeWeight), style: "normal",
    lineHeight: expect.any(String), letterSpacing: expect.any(String), synthesis: "none",
  };
  expect(candidate).toMatchObject(expected);
  expect(reference).toMatchObject({
    ...expected, size: candidate?.size, lineHeight: candidate?.lineHeight,
    letterSpacing: candidate?.letterSpacing,
  });
  expect(reference?.clientWidth).toBe(candidate?.clientWidth);
}

async function collectHeadingMetrics(
  page: Page,
  viewport: (typeof reviewViewports)[number],
) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(fixturePath);
  await waitForEvaluationFonts(page);
  const specimens = await Promise.all(headingEvaluationCases.flatMap((evaluationCase) =>
    headingEvaluationFamilies.map((family) => readComputedSpecimen(
      specimenLocator(page, evaluationCase, family),
    ).then((specimen) => ({
      viewport: viewport.name,
      caseId: evaluationCase.id,
      familyId: family.id,
      state: `${evaluationCase.representativeWeight}-normal`,
      ...specimen,
    }))
  )));
  return { viewport, layout: await readLayoutState(page), specimens };
}

function assertHeadingLayout(
  result: Awaited<ReturnType<typeof collectHeadingMetrics>>,
  viewportName: string,
): void {
  expect(result.layout.documentWidth, viewportName)
    .toBeLessThanOrEqual(result.layout.viewportWidth + 1);
  for (const specimen of result.specimens) assertSpecimenFits(specimen, viewportName);
  for (const entry of result.layout.tocEntries) assertTocEntryFits(entry, viewportName);
}

function assertSpecimenFits(
  specimen: Awaited<ReturnType<typeof collectHeadingMetrics>>["specimens"][number],
  viewportName: string,
): void {
  expect(specimen.scrollWidth, `${viewportName}/${specimen.caseId}/${specimen.familyId}`)
    .toBeLessThanOrEqual(specimen.clientWidth + 1);
}

function assertTocEntryFits(
  entry: Awaited<ReturnType<typeof readLayoutState>>["tocEntries"][number],
  viewportName: string,
): void {
  expect(entry.scrollWidth, `${viewportName}/${entry.caseId}/toc`)
    .toBeLessThanOrEqual(entry.clientWidth + 1);
}

async function writeHeadingMetrics(testInfo: TestInfo, metrics: unknown[]): Promise<void> {
  await writeFile(
    testInfo.outputPath("typography-heading-evaluation-metrics.json"),
    `${JSON.stringify(metrics, null, 4)}\n`,
    "utf8",
  );
}

async function captureHeadingScreenshots(
  page: Page,
  testInfo: TestInfo,
  viewportName: string,
): Promise<void> {
  const review = page.locator(reviewSelector);
  await expect(review).toBeVisible();
  await review.screenshot({
    path: testInfo.outputPath(`typography-heading-evaluation-${viewportName}.png`),
  });
  const layout = page.locator("[data-heading-layout]");
  await expect(layout).toBeVisible();
  await layout.screenshot({
    path: testInfo.outputPath(`typography-heading-layout-${viewportName}.png`),
  });
}

const readComputedSpecimen = async (locator: Locator) => locator.evaluate(
  function(element) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const lineHeight = Number.parseFloat(style.lineHeight);
    return {
      tagName: element.tagName, source: element.textContent, family: style.fontFamily,
      weight: style.fontWeight, style: style.fontStyle, size: style.fontSize,
      lineHeight: style.lineHeight, letterSpacing: style.letterSpacing,
      synthesis: style.fontSynthesis, width: rect.width, height: rect.height,
      clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
      lineCount: Number.isFinite(lineHeight) && lineHeight > 0
        ? Math.max(1, Math.round(rect.height / lineHeight)) : null,
    };
  });

const readLayoutState = async (page: Page) => page.evaluate(() => ({
  documentWidth: document.documentElement.scrollWidth,
  viewportWidth: document.documentElement.clientWidth,
  tocEntries: [...document.querySelectorAll<HTMLElement>("[data-heading-toc-entry]")].map(
    (entry) => ({
      caseId: entry.closest<HTMLElement>("[data-heading-toc-case]")?.dataset.headingTocCase,
      clientWidth: entry.clientWidth,
      scrollWidth: entry.scrollWidth,
      height: entry.getBoundingClientRect().height,
    }),
  ),
}));

const familySelector = (family: HeadingFamily): string => `[data-heading-family="${family.id}"]`;

const specimenLocator = (
  page: Page,
  evaluationCase: HeadingCase,
  family: HeadingFamily,
): Locator =>
  page.locator(
    `[data-heading-case="${evaluationCase.id}"] ${familySelector(family)} [data-heading-specimen]`,
  );

export const reviewViewports = [
  { name: "desktop", width: 1600, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;
