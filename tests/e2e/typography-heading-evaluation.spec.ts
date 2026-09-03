/**
 * Browser evidence for the DIBS Slab heading evaluation.
 *
 * What a JSDOM render cannot check, this suite checks in a real engine:
 *
 * 1. Loading --- every candidate and reference face resolves to `status: "loaded"` and every
 *    `.woff2` request is same-origin (no web-font service, no CDN).
 * 2. Controlled parity --- each candidate/reference pair computes to the same element, text, size,
 *    line-height, letter-spacing and synthesis, so only the font itself differs in the screenshots.
 * 3. Layout safety --- no specimen or table-of-contents entry overflows its column, and the page
 *    never scrolls horizontally, at either review viewport.
 *
 * The screenshots it writes to the test output directory are the qualitative evidence a human uses
 * to make the final typography call; the assertions above just guarantee the screenshots are fair.
 *
 * For course readers: this shows how to turn "does the new font look right?" into a repeatable check
 * --- pin everything that must stay equal, measure it, and leave only the aesthetic judgement to a
 * person.
 */

import { expect, type Locator, type Page, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import {
    headingEvaluationCases,
    headingEvaluationFamilies,
} from "../../src/lib/typography/heading-font-evaluation-fixture";

const fixturePath = "/dev-fixtures/typography-proportional-pair/";
const reviewViewports = [
    { name: "desktop", width: 1600, height: 900 },
    { name: "mobile", width: 390, height: 844 },
] as const;

type HeadingFamily = (typeof headingEvaluationFamilies)[number];
type HeadingCase = (typeof headingEvaluationCases)[number];

function familySelector(family: HeadingFamily): string {
    return `[data-heading-family="${family.id}"]`;
}

function specimenLocator(page: Page, evaluationCase: HeadingCase, family: HeadingFamily): Locator {
    return page.locator(
        `[data-heading-case="${evaluationCase.id}"] ${familySelector(family)} [data-heading-specimen]`,
    );
}

async function waitForFixtureFonts(page: Page): Promise<void> {
    await page.evaluate(() => document.fonts.ready);
}

async function readFontFaces(page: Page) {
    return page.evaluate(() =>
        [...document.fonts]
            .filter(
                (face) => face.family === "DIBS Slab" || face.family === "Space Grotesk Reference 2.0.0",
            )
            .map((face) => ({
                family: face.family,
                style: face.style,
                status: face.status,
                weight: face.weight,
            }))
    );
}

async function readComputedSpecimen(locator: Locator) {
    return locator.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const lineHeight = Number.parseFloat(style.lineHeight);

        return {
            tagName: element.tagName,
            source: element.textContent,
            family: style.fontFamily,
            weight: style.fontWeight,
            style: style.fontStyle,
            size: style.fontSize,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            synthesis: style.fontSynthesis,
            width: rect.width,
            height: rect.height,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            lineCount: Number.isFinite(lineHeight) && lineHeight > 0
                ? Math.max(1, Math.round(rect.height / lineHeight))
                : null,
        };
    });
}

async function readLayoutState(page: Page) {
    return page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        tocEntries: [...document.querySelectorAll<HTMLElement>("[data-heading-toc-entry]")].map((entry) => ({
            caseId: entry.closest<HTMLElement>("[data-heading-toc-case]")?.dataset.headingTocCase,
            clientWidth: entry.clientWidth,
            scrollWidth: entry.scrollWidth,
            height: entry.getBoundingClientRect().height,
        })),
    }));
}

async function collectMetrics(page: Page, viewport: (typeof reviewViewports)[number]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(fixturePath);
    await waitForFixtureFonts(page);

    const specimens = [];
    for (const evaluationCase of headingEvaluationCases) {
        for (const family of headingEvaluationFamilies) {
            specimens.push({
                viewport: viewport.name,
                caseId: evaluationCase.id,
                familyId: family.id,
                state: `${evaluationCase.representativeWeight}-normal`,
                ...(await readComputedSpecimen(specimenLocator(page, evaluationCase, family))),
            });
        }
    }

    return { viewport, layout: await readLayoutState(page), specimens };
}

test.describe("typography heading evaluation", () => {
    test("loads every heading candidate and reference state locally", async ({ page }) => {
        const fontRequests: string[] = [];
        page.on("request", (request) => {
            if (request.url().endsWith(".woff2")) fontRequests.push(request.url());
        });

        await page.goto(fixturePath);
        await waitForFixtureFonts(page);

        const pageOrigin = new URL(page.url()).origin;
        expect(fontRequests.filter((url) => new URL(url).origin !== pageOrigin)).toEqual([]);

        const faces = await readFontFaces(page);
        for (const family of headingEvaluationFamilies) {
            for (const state of family.states) {
                expect(
                    faces.find(
                        (face) =>
                            face.family === family.cssFamily
                            && face.style === state.style
                            && face.weight === String(state.weight),
                    ),
                    `${family.id}/${state.weight}-${state.style}`,
                ).toEqual({
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
        expect(resources.filter((name) => name.includes("/fonts/dibs-slab/")).length).toBe(2);
        expect(resources.filter((name) => name.includes("/dev-fixtures/fonts/space-grotesk-2.0.0/")).length).toBe(2);
    });

    test("keeps paired heading specimens equivalent except for font family", async ({ page }) => {
        await page.goto(fixturePath);
        await waitForFixtureFonts(page);

        for (const evaluationCase of headingEvaluationCases) {
            const computed = await Promise.all(
                headingEvaluationFamilies.map((family) =>
                    readComputedSpecimen(specimenLocator(page, evaluationCase, family))
                ),
            );
            const [candidate, reference] = computed;

            expect(candidate?.tagName, evaluationCase.id).toBe(evaluationCase.semanticLevel.toUpperCase());
            expect(reference?.tagName, evaluationCase.id).toBe(candidate?.tagName);
            expect(candidate?.source, `${evaluationCase.id}/source`).toBe(evaluationCase.text);
            expect(reference?.source, `${evaluationCase.id}/source`).toBe(candidate?.source);
            expect(candidate?.family, `${evaluationCase.id}/candidate-family`).toContain("DIBS Slab");
            expect(reference?.family, `${evaluationCase.id}/reference-family`).toContain(
                "Space Grotesk Reference 2.0.0",
            );
            expect(candidate).toMatchObject({
                weight: String(evaluationCase.representativeWeight),
                style: "normal",
                lineHeight: expect.any(String),
                letterSpacing: expect.any(String),
                synthesis: "none",
            });
            expect(reference).toMatchObject({
                weight: String(evaluationCase.representativeWeight),
                style: "normal",
                size: candidate?.size,
                lineHeight: candidate?.lineHeight,
                letterSpacing: candidate?.letterSpacing,
                synthesis: "none",
            });
            expect(reference?.clientWidth).toBe(candidate?.clientWidth);
        }
    });

    test(
        "keeps heading and TOC surfaces within their intended layout at both review viewports",
        async ({ page }, testInfo) => {
            const metrics = [];
            for (const viewport of reviewViewports) {
                const result = await collectMetrics(page, viewport);
                metrics.push(result);

                expect(result.layout.documentWidth, viewport.name).toBeLessThanOrEqual(result.layout.viewportWidth + 1);
                for (const specimen of result.specimens) {
                    expect(specimen.scrollWidth, `${viewport.name}/${specimen.caseId}/${specimen.familyId}`)
                        .toBeLessThanOrEqual(
                            specimen.clientWidth + 1,
                        );
                }
                for (const entry of result.layout.tocEntries) {
                    expect(entry.scrollWidth, `${viewport.name}/${entry.caseId}/toc`).toBeLessThanOrEqual(
                        entry.clientWidth + 1,
                    );
                }
            }

            await writeFile(
                testInfo.outputPath("typography-heading-evaluation-metrics.json"),
                `${JSON.stringify(metrics, null, 4)}\n`,
                "utf8",
            );
        },
    );

    for (const viewport of reviewViewports) {
        test(`captures ${viewport.name} heading review evidence`, async ({ page }, testInfo) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto(fixturePath);
            await waitForFixtureFonts(page);

            const review = page.locator("[data-visual-review=\"heading-font-comparison\"]");
            await expect(review).toBeVisible();
            await review.screenshot({
                path: testInfo.outputPath(`typography-heading-evaluation-${viewport.name}.png`),
            });

            const layout = page.locator("[data-heading-layout]");
            await expect(layout).toBeVisible();
            await layout.screenshot({
                path: testInfo.outputPath(`typography-heading-layout-${viewport.name}.png`),
            });
        });
    }
});
