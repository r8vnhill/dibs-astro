import { expect, type Page, test } from "@playwright/test";

/**
 * Real-browser regression for the lesson TOC shell staying pinned beside the article for the full
 * height of a long lesson. jsdom-based render tests cannot catch this: CSS layout (grid item sizing,
 * sticky containing blocks) is not computed in jsdom, so a broken containing-block relationship is
 * invisible to them. See `traceability-log/open/fix_keep_the_lesson_toc_pinned_throughout_long_page_scrolling.md`.
 */

const LESSON_PATH = "/notes/software-libraries/what-is/";
const STICKY_TOLERANCE_PX = 2;

// Later sections of the real lesson, used to exercise scroll depths well past the first screenful.
const LATER_SECTION_IDS = ["h2-contract", "h2-encapsulation", "h2-stability", "continue-reading"];

async function captureDiagnostics(page: Page) {
    return page.evaluate(() => {
        const aside = document.querySelector<HTMLElement>(".lesson-toc-rail");
        const nav = aside?.querySelector<HTMLElement>("[data-lesson-toc]");
        const asideRect = aside?.getBoundingClientRect();
        const navRect = nav?.getBoundingClientRect();
        return {
            scrollY: window.scrollY,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            asideRect: asideRect && { top: asideRect.top, bottom: asideRect.bottom, height: asideRect.height },
            navRect: navRect && { top: navRect.top, bottom: navRect.bottom, height: navRect.height },
            navComputedPosition: nav ? getComputedStyle(nav).position : null,
            asideComputedPosition: aside ? getComputedStyle(aside).position : null,
        };
    });
}

async function assertWithDiagnostics(page: Page, assertion: () => Promise<void> | void): Promise<void> {
    try {
        await assertion();
    } catch (error) {
        const diagnostics = await captureDiagnostics(page);
        throw new Error(`${(error as Error).message}\n\nDiagnostics: ${JSON.stringify(diagnostics, null, 2)}`);
    }
}

test.describe("lesson TOC stays pinned throughout long-page scrolling (normal desktop viewport)", () => {
    test.use({ viewport: { width: 1600, height: 900 } });

    test.beforeEach(async ({ page }) => {
        await page.goto(LESSON_PATH);
    });

    test("given a TOC-enabled desktop viewport, the lesson TOC is visible and the lesson exceeds the viewport height", async ({ page }) => {
        await expect(page.locator(".lesson-toc-rail")).toBeVisible();

        const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        const viewportHeight = page.viewportSize()?.height ?? 0;
        expect(documentHeight).toBeGreaterThan(viewportHeight);
    });

    for (const sectionId of LATER_SECTION_IDS) {
        test(`"En esta página" and the TOC navigation remain visible after scrolling to #${sectionId}`, async ({ page }) => {
            const tocTitle = page.locator(".lesson-toc-rail [data-lesson-toc]").getByText("En esta página", {
                exact: true,
            });
            const tocNav = page.locator(".lesson-toc-rail [data-lesson-toc]");

            await page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
            await page.waitForTimeout(100);

            const scrolled = await page.evaluate(() => window.scrollY);
            expect(scrolled).toBeGreaterThan(0);

            await assertWithDiagnostics(page, async () => {
                await expect(tocTitle).toBeInViewport({ ratio: 1 });
                await expect(tocNav).toBeInViewport();
            });
        });
    }

    test("once the TOC has entered its sticky state, further document scrolling does not move its viewport top", async ({ page }) => {
        const tocNav = page.locator(".lesson-toc-rail [data-lesson-toc]");

        await page.locator("#h2-contract").scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        const stuckTop = (await tocNav.boundingBox())!.y;

        await page.locator("#continue-reading").scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        const laterTop = (await tocNav.boundingBox())!.y;

        await assertWithDiagnostics(page, async () => {
            expect(Math.abs(laterTop - stuckTop)).toBeLessThanOrEqual(STICKY_TOLERANCE_PX);
        });
    });
});

test.describe("lesson TOC stays pinned throughout long-page scrolling (short desktop viewport, overflowing TOC list)", () => {
    // Short enough that this lesson's TOC entries exceed the panel's available height, forcing real
    // internal scrolling — the same precondition established in `lesson-toc-scroll.spec.ts`. A taller
    // viewport (e.g. the plan's suggested 700px) lets this lesson's ~9 entries fit without ever
    // overflowing, which would make the overflow-specific assertions below pass vacuously.
    test.use({ viewport: { width: 1600, height: 480 } });

    test.beforeEach(async ({ page }) => {
        await page.goto(LESSON_PATH);
    });

    test("the TOC heading and shell remain visible after scrolling deep into the lesson", async ({ page }) => {
        const tocTitle = page.locator(".lesson-toc-rail [data-lesson-toc]").getByText("En esta página", {
            exact: true,
        });
        const tocShell = page.locator(".lesson-toc-rail");

        await page.locator("#h2-stability").scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);

        await assertWithDiagnostics(page, async () => {
            await expect(tocTitle).toBeInViewport({ ratio: 1 });
            await expect(tocShell).toBeInViewport();
        });
    });

    test("given entries exceed the available TOC height, the entry list scrolls independently without moving the heading", async ({ page }) => {
        const scroller = page.locator(".lesson-toc-rail [data-lesson-toc-scroll]");
        const tocTitle = page.locator(".lesson-toc-rail [data-lesson-toc]").getByText("En esta página", {
            exact: true,
        });

        await page.locator("#h2-stability").scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);

        const maxScrollTop = await scroller.evaluate((el) => el.scrollHeight - el.clientHeight);
        expect(maxScrollTop).toBeGreaterThan(0);

        await scroller.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
        });
        expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

        await expect(tocTitle).toBeInViewport({ ratio: 1 });
    });
});

test.describe("manual TOC-list scrolling is independent of the document viewport", () => {
    test.use({ viewport: { width: 1600, height: 480 } });

    test.beforeEach(async ({ page }) => {
        await page.goto(LESSON_PATH);
    });

    test("scrolling the TOC list does not move window.scrollY, and the TOC shell stays pinned once article scrolling resumes", async ({ page }) => {
        const scroller = page.locator(".lesson-toc-rail [data-lesson-toc-scroll]");
        const tocNav = page.locator(".lesson-toc-rail [data-lesson-toc]");

        await page.locator("#h2-stability").scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        const scrollYBefore = await page.evaluate(() => window.scrollY);

        const maxScrollTop = await scroller.evaluate((el) => el.scrollHeight - el.clientHeight);
        expect(maxScrollTop).toBeGreaterThan(0);
        await scroller.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
        });

        expect(await page.evaluate(() => window.scrollY)).toBe(scrollYBefore);
        expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

        // Reader resumes scrolling the article itself.
        await page.locator("#continue-reading").scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);

        await assertWithDiagnostics(page, async () => {
            await expect(tocNav).toBeInViewport();
        });
    });
});
