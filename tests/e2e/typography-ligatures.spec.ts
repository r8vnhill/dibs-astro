/**
 * Browser-level proof for the temporary ligature comparison fixture.
 *
 * The static render test checks the specimen matrix. These checks add the browser-only contract: all local font
 * faces load, disabled and enabled modes preserve their inputs, and the font actually produces a visual difference
 * where the bundled feature tables provide one.
 */

import { expect, type Locator, type Page, test } from "@playwright/test";
import { proportionalFontContract } from "../../src/lib/typography/proportional-font-contract";
import {
    proportionalFontFeatureModes,
    proportionalFontFixtureProfiles,
    typographyStateKey,
} from "../../src/lib/typography/proportional-font-fixture";

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

function getFontStates(): FontStateDescriptor[] {
    return proportionalFontFixtureProfiles.flatMap((profile) =>
        profile.states.map((state) => ({
            family: profile.familyName,
            style: state.style,
            weight: state.weight,
        }))
    );
}

async function inspectFontState(page: Page, fontState: FontStateDescriptor) {
    return page.evaluate((state) => {
        const face = [...document.fonts].find(
            (candidate) =>
                candidate.family === state.family
                && candidate.style === state.style
                && candidate.weight === String(state.weight),
        );

        return {
            faceStatus: face?.status ?? "missing",
            matchingResources: performance
                .getEntriesByType("resource")
                .filter((entry) => entry.name.endsWith(".woff2"))
                .map((entry) => entry.name),
        };
    }, fontState);
}

async function assertFontStatesLoaded(page: Page): Promise<void> {
    for (const fontState of getFontStates()) {
        const result = await inspectFontState(page, fontState);
        const label = `${fontState.family} ${fontState.weight} ${fontState.style}`;

        expect(result.faceStatus, label).toBe("loaded");
        expect(result.matchingResources.length, `${label} resource count`).toBeGreaterThan(0);
    }
}

function specimenSelector(profile: ComparisonProfile, state: ComparisonProfile["states"][number], ligatureId: string) {
    return [
        `[data-typography-role="${profile.role}"]`,
        `[data-font-family="${profile.familyId}"]`,
        `[data-typography-state="${typographyStateKey(state)}"]`,
        `[data-ligature-id="${ligatureId}"]`,
    ].join("");
}

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

async function readComputedTypography(sample: Locator): Promise<ComputedTypography> {
    return sample.evaluate((element) => {
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
    });
}

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
    expect(disabledStyle.ligatures, `${identity}/disabled features`).toBe("none");
    expect(enabledStyle.ligatures, `${identity}/enabled features`).toContain("common-ligatures");
    expect(enabledStyle.ligatures, `${identity}/enabled features`).toContain("contextual");
}

async function assertPairStyles(
    comparison: Locator,
    profile: ComparisonProfile,
    state: ComparisonProfile["states"][number],
    ligature: (typeof proportionalFontContract.ligatures)[number],
): Promise<void> {
    const { pair, disabled, enabled } = getPairLocators(comparison, profile, state, ligature.id);
    const identity = `${profile.role}/${profile.familyId}/${typographyStateKey(state)}/${ligature.id}`;

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
    const disabledImage = await disabled.screenshot();

    await enabled.scrollIntoViewIfNeeded();
    const enabledImage = await enabled.screenshot();

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
    const identity = `${profile.role}/${profile.familyId}/${typographyStateKey(state)}/${ligature.id}`;

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

test.describe("typography ligature comparison", () => {
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

    test("rasterizes a differential for every bundled ligature specimen", async ({ page }) => {
        const unchanged = await collectUnchangedPairIdentities(page);

        expect(unchanged, "pairs with identical disabled/enabled pixels").toEqual([]);
    });

    test("matches the representative disabled/enabled comparison", async ({ page }) => {
        await showRepresentativeStates(page);
        await expect(page.locator("[data-visual-review=\"ligature-comparison\"]")).toHaveScreenshot(
            "typography-ligatures-off-on.png",
            {
                fullPage: true,
                animations: "disabled",
            },
        );
    });
});
