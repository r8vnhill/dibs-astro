/**
 * Browser evidence for the DIBS Sans body/UI evaluation.
 *
 * The dedicated ligature differential lives in a separate fixture. This spec proves that the comparison uses the
 * intended local faces, keeps its paired layout constraints, and produces reviewable desktop/mobile captures.
 */

import { expect, type Locator, type Page, test } from "@playwright/test";
import { bodyEvaluationFamilies, bodyEvaluationSurfaces } from "../../src/lib/typography/body-font-evaluation-fixture";

const fixturePath = "/dev-fixtures/typography-proportional-pair/";
const reviewViewports = [
    { name: "desktop", width: 1600, height: 900 },
    { name: "mobile", width: 390, height: 844 },
] as const;

type FontState = (typeof bodyEvaluationFamilies)[number]["states"][number];
type Family = (typeof bodyEvaluationFamilies)[number];

function stateSelector(family: Family, state: FontState): string {
    return `[data-evaluation-family="${family.id}"] [data-evaluation-state="${state.weight}-${state.style}"]`;
}

function surfaceLocator(page: Page, family: Family, state: FontState, surfaceId: string): Locator {
    return page.locator(
        `${stateSelector(family, state)} [data-evaluation-surface="${surfaceId}"]`,
    );
}

async function waitForFixtureFonts(page: Page): Promise<void> {
    await page.evaluate(() => document.fonts.ready);
}

async function readFontFaces(page: Page) {
    return page.evaluate(() =>
        [...document.fonts]
            .filter((face) => face.family === "DIBS Sans" || face.family === "Inter Reference 4.1")
            .map((face) => ({ family: face.family, style: face.style, status: face.status, weight: face.weight }))
    );
}

async function readComputedState(locator: Locator) {
    return locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
            family: style.fontFamily,
            weight: style.fontWeight,
            style: style.fontStyle,
            size: style.fontSize,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            ligatures: style.fontVariantLigatures,
            synthesis: style.fontSynthesis,
        };
    });
}

async function readLayoutDiagnostics(locator: Locator) {
    return locator.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
        };
    });
}

test.describe("typography body/UI evaluation", () => {
    test("loads every candidate and reference state locally without external font requests", async ({ page }) => {
        const fontRequests: string[] = [];
        page.on("request", (request) => {
            const url = request.url();
            if (url.endsWith(".woff2")) fontRequests.push(url);
        });

        await page.goto(fixturePath);
        await waitForFixtureFonts(page);

        const pageOrigin = new URL(page.url()).origin;
        expect(fontRequests.filter((url) => new URL(url).origin !== pageOrigin)).toEqual([]);
        const faces = await readFontFaces(page);
        for (const family of bodyEvaluationFamilies) {
            for (const state of family.states) {
                const face = faces.find(
                    (candidate) =>
                        candidate.family === family.cssFamily
                        && candidate.style === state.style
                        && candidate.weight === String(state.weight),
                );

                expect(face, `${family.id}/${state.weight}-${state.style}`).toEqual({
                    family: family.cssFamily,
                    style: state.style,
                    status: "loaded",
                    weight: String(state.weight),
                });
            }
        }

        const resources = await page.evaluate(() =>
            performance
                .getEntriesByType("resource")
                .map((entry) => entry.name)
                .filter((name) => name.endsWith(".woff2"))
        );
        expect(resources.filter((name) => name.includes("/fonts/dibs-sans/")).length).toBeGreaterThanOrEqual(4);
        expect(resources.filter((name) => name.includes("/dev-fixtures/fonts/inter-4.1/")).length).toBe(4);
    });

    test("keeps paired states identical except for the font family and prevents horizontal overflow", async ({ page }) => {
        await page.goto(fixturePath);
        await waitForFixtureFonts(page);

        for (const state of bodyEvaluationFamilies[0].states) {
            const computedStates = await Promise.all(
                bodyEvaluationFamilies.map((family) => readComputedState(page.locator(stateSelector(family, state)))),
            );
            expect(computedStates[0].family).toContain("DIBS Sans");
            expect(computedStates[1].family).toContain("Inter Reference 4.1");
            expect(computedStates[0]).toMatchObject({
                weight: String(state.weight),
                style: state.style,
                size: "17px",
                lineHeight: "28.05px",
                letterSpacing: "normal",
                ligatures: "common-ligatures contextual",
                synthesis: "none",
            });
            expect(computedStates[1]).toMatchObject({
                weight: String(state.weight),
                style: state.style,
                size: "17px",
                lineHeight: "28.05px",
                letterSpacing: "normal",
                ligatures: "common-ligatures contextual",
                synthesis: "none",
            });
            expect(computedStates[0].weight).toBe(computedStates[1].weight);
            expect(computedStates[0].style).toBe(computedStates[1].style);
            expect(computedStates[0].size).toBe(computedStates[1].size);
            expect(computedStates[0].lineHeight).toBe(computedStates[1].lineHeight);

            for (const family of bodyEvaluationFamilies) {
                for (const surface of bodyEvaluationSurfaces) {
                    const diagnostics = await readLayoutDiagnostics(
                        surfaceLocator(page, family, state, surface.id),
                    );
                    expect(diagnostics.scrollWidth, `${family.id}/${state.weight}-${state.style}/${surface.id}`)
                        .toBeLessThanOrEqual(
                            diagnostics.clientWidth + 1,
                        );
                }
            }
        }
    });

    for (const viewport of reviewViewports) {
        test(`captures the ${viewport.name} body/UI review evidence`, async ({ page }, testInfo) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto(fixturePath);
            await waitForFixtureFonts(page);
            await page.addStyleTag({
                content: `
                    [data-visual-review="body-font-comparison"] .body-evaluation-surface { display: none; }
                    [data-visual-review="body-font-comparison"]
                        [data-evaluation-representative="true"] .body-evaluation-surface { display: block; }
                `,
            });

            const review = page.locator("[data-visual-review=\"body-font-comparison\"]");
            await expect(review).toBeVisible();
            await review.screenshot({
                path: testInfo.outputPath(`typography-body-evaluation-${viewport.name}.png`),
            });
        });
    }
});
