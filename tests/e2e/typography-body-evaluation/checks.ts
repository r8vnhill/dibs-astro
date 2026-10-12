/** Body/UI assertions and captures shared by the focused Playwright scenarios. */
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import {
  bodyEvaluationFamilies,
  bodyEvaluationSurfaces,
} from "../../../src/lib/typography/body-font-evaluation-fixture";
import {
  readFontResourcePaths,
  readLoadedFonts,
  recordFontRequests,
  unexpectedExternalFontRequests,
  waitForEvaluationFonts,
} from "../typography-evaluation-common";
import { isProductionFiraCodeFontResource } from "../typography-font-resource-policy";

const fixturePath = "/dev-fixtures/typography-proportional-pair/";
const reviewSelector = "[data-visual-review=\"body-font-comparison\"]";
type Family = (typeof bodyEvaluationFamilies)[number];
type FontState = Family["states"][number];

export async function verifyBodyFonts(page: Page): Promise<void> {
  const requests = recordFontRequests(page);
  await page.goto(fixturePath);
  await waitForEvaluationFonts(page);
  assertApprovedFontRequests(requests, new URL(page.url()).origin);
  const families = bodyEvaluationFamilies.map(({ cssFamily }) => cssFamily);
  assertBodyFaces(await readLoadedFonts(page, families));
  assertBodyResources(await readFontResourcePaths(page));
}

export async function verifyBodyParity(page: Page): Promise<void> {
  await page.goto(fixturePath);
  await waitForEvaluationFonts(page);
  const [candidate, reference] = bodyEvaluationFamilies;
  for (const state of candidate.states) {
    const computed = await Promise.all([
      readComputedState(page.locator(stateSelector(candidate, state))),
      readComputedState(page.locator(stateSelector(reference, state))),
    ]);
    assertPairedState(computed, state);
    await assertBodySurfacesFit(page, state);
  }
}

export async function captureBodyReview(
  page: Page,
  testInfo: TestInfo,
  viewport: { name: string; width: number; height: number },
): Promise<void> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(fixturePath);
  await waitForEvaluationFonts(page);
  await showRepresentativeSurfaces(page);
  const review = page.locator(reviewSelector);
  await expect(review).toBeVisible();
  await review.screenshot({
    path: testInfo.outputPath(`typography-body-evaluation-${viewport.name}.png`),
  });
}

function assertApprovedFontRequests(requests: readonly string[], pageOrigin: string): void {
  const unexpected = unexpectedExternalFontRequests(requests, pageOrigin)
    .filter((url) => !isProductionFiraCodeFontResource(url));
  expect(unexpected).toEqual([]);
}

function assertBodyFaces(faces: Awaited<ReturnType<typeof readLoadedFonts>>): void {
  for (const family of bodyEvaluationFamilies) {
    for (const state of family.states) assertBodyFace(faces, family, state);
  }
}

function assertBodyFace(
  faces: Awaited<ReturnType<typeof readLoadedFonts>>,
  family: Family,
  state: FontState,
): void {
  const loadedFace = faces.find((face) =>
    face.family === family.cssFamily
    && face.style === state.style
    && face.weight === String(state.weight)
  );
  expect(loadedFace, `${family.id}/${state.weight}-${state.style}`).toEqual({
    family: family.cssFamily,
    style: state.style,
    status: "loaded",
    weight: String(state.weight),
  });
}

function assertBodyResources(paths: readonly string[]): void {
  expect(paths.filter((path) => path.includes("/fonts/dibs-sans/")).length)
    .toBeGreaterThanOrEqual(4);
  expect(paths.filter((path) => path.includes("/dev-fixtures/fonts/inter-4.1/")).length).toBe(4);
}

async function assertBodySurfacesFit(page: Page, state: FontState): Promise<void> {
  for (const family of bodyEvaluationFamilies) {
    for (const surface of bodyEvaluationSurfaces) {
      const diagnostics = await readLayoutDiagnostics(
        page.locator(`${stateSelector(family, state)} [data-evaluation-surface="${surface.id}"]`),
      );
      expect(diagnostics.scrollWidth, `${family.id}/${state.weight}-${state.style}/${surface.id}`)
        .toBeLessThanOrEqual(diagnostics.clientWidth + 1);
    }
  }
}

function assertPairedState(
  computed: ComputedPair,
  state: FontState,
): void {
  expect(computed[0].family).toContain("DIBS Sans");
  expect(computed[1].family).toContain("Inter Reference 4.1");
  assertTypographySettings(computed, state);
  expect(computed[0].weight).toBe(computed[1].weight);
  expect(computed[0].style).toBe(computed[1].style);
  expect(computed[0].size).toBe(computed[1].size);
  expect(computed[0].lineHeight).toBe(computed[1].lineHeight);
}

function assertTypographySettings(
  computed: ComputedPair,
  state: FontState,
): void {
  const expected = {
    weight: String(state.weight), style: state.style, size: "17px", lineHeight: "28.05px",
    letterSpacing: "normal", ligatures: "common-ligatures contextual", synthesis: "none",
  };
  expect(computed[0]).toMatchObject(expected);
  expect(computed[1]).toMatchObject(expected);
}

const readComputedState = async (locator: Locator) => locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      family: style.fontFamily, weight: style.fontWeight, style: style.fontStyle,
      size: style.fontSize, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing,
      ligatures: style.fontVariantLigatures, synthesis: style.fontSynthesis,
    };
  });

type ComputedState = Awaited<ReturnType<typeof readComputedState>>;
type ComputedPair = readonly [ComputedState, ComputedState];

const readLayoutDiagnostics = async (locator: Locator) => locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));

async function showRepresentativeSurfaces(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      ${reviewSelector} .body-evaluation-surface { display: none; }
      ${reviewSelector} [data-evaluation-representative="true"] .body-evaluation-surface {
        display: block;
      }
    `,
  });
}

const stateSelector = (family: Family, state: FontState): string =>
  `[data-evaluation-family="${family.id}"] `
  + `[data-evaluation-state="${state.weight}-${state.style}"]`;
