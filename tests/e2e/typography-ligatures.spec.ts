/**
 * Browser checks for the temporary ligature comparison fixture.
 *
 * Static render tests check the specimen matrix. These checks add the browser contract: local font
 * faces load, feature modes preserve their inputs, and bundled sequences change the output.
 * Source text remains available to the independent
 * selection and clipboard checks, and Chromium attributes the rendered glyphs to their font file.
 */

import { expect, type Locator, type Page, test, type TestInfo } from "@playwright/test";
import { proportionalFontContract } from "../../src/lib/typography/proportional-font-contract";
import {
  proportionalFontFixtureProfiles,
  typographyStateKey,
} from "../../src/lib/typography/proportional-font-fixture";
import { readRenderedFontsForNodes } from "./typography-system-evaluation/metrics";

const fixturePath = "/dev-fixtures/typography-proportional-pair/";

type ComparisonProfile = (typeof proportionalFontFixtureProfiles)[number];
type FontStateDescriptor = Readonly<{
  family: string;
  style: string;
  weight: number;
}>;
type ComputedTypography = Readonly<{
  family: string;
  weight: string;
  style: string;
  size: string;
  lineHeight: string;
  ligatures: string;
  text: string;
}>;

const getFontStates = (): FontStateDescriptor[] =>
  proportionalFontFixtureProfiles.flatMap((profile) =>
    profile.states.map((state) => ({
      family: profile.familyName,
      style: state.style,
      weight: state.weight,
    })));

const inspectFontState = async (page: Page, fontState: FontStateDescriptor) =>
  page.evaluate(function(state) {
    const face = [...document.fonts].find(
      (candidate) => candidate.family.replace(/^"|"$/g, "") === state.family
        && candidate.style === state.style
        && candidate.weight === String(state.weight)
    );

    return {
      faceStatus: face?.status ?? "missing",
      matchingResources: performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.endsWith(".woff2"))
        .map((entry) => entry.name),
    };
  }, fontState)

async function assertFontStatesLoaded(page: Page): Promise<void> {
  for (const fontState of getFontStates()) {
    const result = await inspectFontState(page, fontState);
    const label = `${fontState.family} ${fontState.weight} ${fontState.style}`;

    expect(result.faceStatus, label).toBe("loaded");
    expect(result.matchingResources.length, `${label} resource count`).toBeGreaterThan(0);
  }
}

const specimenSelector = (
  profile: ComparisonProfile,
  state: ComparisonProfile["states"][number],
  ligatureId: string,
): string => [
  `[data-typography-role="${profile.role}"]`,
  `[data-font-family="${profile.familyId}"]`,
  `[data-typography-state="${typographyStateKey(state)}"]`,
  `[data-ligature-id="${ligatureId}"]`,
].join("")

function getPairLocators(
  comparison: Locator,
  profile: ComparisonProfile,
  state: ComparisonProfile["states"][number],
  ligatureId: string,
) {
  const selector = specimenSelector(profile, state, ligatureId);

  return {
    pair: comparison.locator(selector),
    disabled: comparison.locator(`${selector}[data-feature-mode="disabled"]`),
    enabled: comparison.locator(`${selector}[data-feature-mode="enabled"]`),
  };
}

const readComputedTypography = async (sample: Locator): Promise<ComputedTypography> =>
  sample.evaluate(function(element) {
    const style = getComputedStyle(element);

    return {
      family: style.fontFamily,
      weight: style.fontWeight,
      style: style.fontStyle,
      size: style.fontSize,
      lineHeight: style.lineHeight,
      ligatures: style.fontVariantLigatures,
      text: element.textContent ?? "",
    };
  })

async function assertPairElements(
  pair: Locator,
  disabled: Locator,
  enabled: Locator,
  identity: string,
): Promise<void> {
  await expect(pair, identity).toHaveCount(2);
  await expect(disabled, `${identity}/disabled`).toHaveCount(1);
  await expect(enabled, `${identity}/enabled`).toHaveCount(1);
}

async function assertPairTypography(
  disabled: Locator,
  enabled: Locator,
  ligature: (typeof proportionalFontContract.ligatures)[number],
  identity: string,
): Promise<void> {
  const [disabledStyle, enabledStyle] = await Promise.all([
    readComputedTypography(disabled),
    readComputedTypography(enabled),
  ]);

  expect(disabledStyle.text, `${identity}/source`).toBe(ligature.source);
  expect(enabledStyle.text, `${identity}/source`).toBe(ligature.source);
  expect(enabledStyle).toMatchObject({
    family: disabledStyle.family,
    weight: disabledStyle.weight,
    style: disabledStyle.style,
    size: disabledStyle.size,
    lineHeight: disabledStyle.lineHeight,
  });
  expect(disabledStyle.family, `${identity}/family`).toContain(ligatureFamily(identity));
  expect(enabledStyle.family, `${identity}/family`).toContain(ligatureFamily(identity));
  assertLigatureFeatureModes(disabledStyle, enabledStyle, identity);
}

function assertLigatureFeatureModes(
  disabled: ComputedTypography,
  enabled: ComputedTypography,
  identity: string,
): void {
  expect(disabled.ligatures, `${identity}/disabled features`).toBe("none");
  expect(enabled.ligatures, `${identity}/enabled features`).toContain("common-ligatures");
  expect(enabled.ligatures, `${identity}/enabled features`).toContain("contextual");
}

const ligatureFamily = (identity: string): string =>
  identity.startsWith("body/") ? "DIBS Sans" : "DIBS Slab";

async function assertPairStyles(
  comparison: Locator,
  profile: ComparisonProfile,
  state: ComparisonProfile["states"][number],
  ligature: (typeof proportionalFontContract.ligatures)[number],
): Promise<void> {
  const { pair, disabled, enabled } = getPairLocators(comparison, profile, state, ligature.id);
  const identity = `${profile.role}/${profile.familyId}/${
    typographyStateKey(state)
  }/${ligature.id}`;

  await assertPairElements(pair, disabled, enabled, identity);
  await assertPairTypography(disabled, enabled, ligature, identity);
}

async function assertAllPairStyles(page: Page): Promise<void> {
  const comparison = page.locator("[data-visual-review=\"ligature-comparison\"]");

  await expect(comparison.locator("[data-typography-specimen=\"ligature\"]")).toHaveCount(156);
  for (const profile of proportionalFontFixtureProfiles) {
    for (const state of profile.states) {
      for (const ligature of proportionalFontContract.ligatures) {
        await assertPairStyles(comparison, profile, state, ligature);
      }
    }
  }
}

async function capturePairImages(disabled: Locator, enabled: Locator): Promise<boolean> {
  await disabled.scrollIntoViewIfNeeded();
  const disabledBox = await disabled.boundingBox();
  const enabledBox = await enabled.boundingBox();
  expect(Math.abs((disabledBox?.width ?? 0) - (enabledBox?.width ?? 0)))
    .toBeLessThan(0.1);
  expect(Math.abs((disabledBox?.height ?? 0) - (enabledBox?.height ?? 0)))
    .toBeLessThan(0.1);
  const screenshotOptions = {
    animations: "disabled" as const,
    caret: "hide" as const,
    scale: "css" as const,
  };
  const disabledImage = await disabled.screenshot(screenshotOptions);

  await enabled.scrollIntoViewIfNeeded();
  const enabledImage = await enabled.screenshot(screenshotOptions);

  return enabledImage.equals(disabledImage);
}

async function captureRasterDifference(
  page: Page,
  comparison: Locator,
  profile: ComparisonProfile,
  state: ComparisonProfile["states"][number],
  ligature: (typeof proportionalFontContract.ligatures)[number],
): Promise<string | undefined> {
  const { pair, disabled, enabled } = getPairLocators(comparison, profile, state, ligature.id);
  const identity = `${profile.role}/${profile.familyId}/${
    typographyStateKey(state)
  }/${ligature.id}`;

  await expect(pair, identity).toHaveCount(2);
  await expect(disabled).toHaveAttribute("data-feature-mode", "disabled");
  await expect(enabled).toHaveAttribute("data-feature-mode", "enabled");
  try {
    return (await capturePairImages(disabled, enabled)) ? identity : undefined;
  } finally {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
}

async function collectUnchangedPairIdentities(page: Page): Promise<string[]> {
  const comparison = page.locator("[data-visual-review=\"ligature-comparison\"]");
  const unchanged: string[] = [];

  for (const profile of proportionalFontFixtureProfiles) {
    for (const state of profile.states) {
      for (const ligature of proportionalFontContract.ligatures) {
        const identity = await captureRasterDifference(page, comparison, profile, state, ligature);
        if (identity) unchanged.push(identity);
      }
    }
  }

  return unchanged;
}

function assertRenderedFace(
  result: Awaited<ReturnType<typeof collectLigatureFontEvidence>>[number],
): void {
  const label = `${result.role}/${result.state}/${result.sequence}/${result.mode}`;
  expect(result.fonts.some((font) => font.familyName.includes(result.family)), label).toBe(true);
  expect(
    result.fonts.filter((font) => font.glyphCount > 0).map(({ familyName }) => familyName),
    label,
  )
    .toEqual([expect.stringContaining(result.family)]);
}

async function collectLigatureFontEvidence(page: Page) {
  const selector = "[data-typography-specimen='ligature']";
  const identities = await page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => ({
      family: element.getAttribute("data-font-family") === "dibs-sans"
        ? "DIBS Sans"
        : "DIBS Slab",
      role: element.getAttribute("data-typography-role"),
      state: element.getAttribute("data-typography-state"),
      sequence: element.getAttribute("data-ligature-id"),
      mode: element.getAttribute("data-feature-mode"),
    }))
  );
  const reports = await readRenderedFontsForNodes(page, selector);

  expect(reports).toHaveLength(identities.length);
  return identities.map((identity, index) => ({ ...identity, fonts: reports[index] ?? [] }));
}

async function showRepresentativeStates(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
            [data-visual-review="ligature-comparison"] [data-typography-state] { display: none; }
            [data-visual-review="ligature-comparison"] [data-visual-review-state="representative"],
            [data-visual-review="ligature-comparison"] [data-visual-review-state="representative"]
                [data-typography-specimen="ligature"] {
                display: block;
            }
        `,
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto(fixturePath);
  await page.evaluate(() => document.fonts.ready);
});

test("loads every local font state used by the fixture", async ({ page }) => {
  await assertFontStatesLoaded(page);
});

test("preserves pair styles and applies the requested feature modes", async ({ page }) => {
  await assertAllPairStyles(page);
});

test("uses the intended candidate font for every specimen in Chromium", async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== "chromium",
    "Rendered font attribution uses Chromium DevTools Protocol.",
  );
  const evidence = await collectLigatureFontEvidence(page);
  evidence.forEach(assertRenderedFace);
  await testInfo.attach("ligature-font-attribution.json", {
    body: JSON.stringify(
      { browser: { name: browserName, version: browser.version() }, evidence },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

test("rasterizes a differential for every bundled ligature specimen", async ({
  page,
  browserName,
}, testInfo) => {
  const unchanged = await collectUnchangedPairIdentities(page);

  expect(unchanged, "pairs with identical disabled/enabled pixels").toEqual([]);
  await attachDifferentialResult(testInfo, browserName, unchanged);
});

async function attachDifferentialResult(
  testInfo: TestInfo,
  browserName: string,
  unchanged: readonly string[],
): Promise<void> {
  const pairsCompared = proportionalFontFixtureProfiles.reduce(
    (count, profile) => count + profile.states.length * proportionalFontContract.ligatures.length,
    0,
  );
  await testInfo.attach("ligature-differential-result.json", {
    body: JSON.stringify(
      { browser: browserName, pairsCompared, unchanged, status: "verified" },
      null,
      2,
    ),
    contentType: "application/json",
  });
}

test("captures the representative disabled/enabled comparison", async ({
  page,
  browserName,
}, testInfo) => {
  await showRepresentativeStates(page);
  const comparison = page.locator("[data-visual-review=\"ligature-comparison\"]");
  await testInfo.attach(`typography-ligature-comparison-${browserName}.png`, {
    body: await comparison.screenshot({ animations: "disabled", caret: "hide" }),
    contentType: "image/png",
  });
});
