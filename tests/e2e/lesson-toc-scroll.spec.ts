import { expect, type Locator, test } from "@playwright/test";

/**
 * Real-browser regression for the lesson TOC auto-reveal behavior. Pure-function and jsdom-based
 * tests cannot catch this class of defect: jsdom doesn't implement layout, so a broken
 * `offsetParent`/CSSOM assumption in the DOM adapter is invisible to them. See
 * `traceability-log/closed/2026/08/13/fix_keep_the_active_lesson_toc_entry_visible_within_the_scrollable_panel.md`.
 *
 * Uses actual bounding-client-rect geometry rather than Playwright's `visible` check, because an
 * element clipped by a scroll container's `overflow: hidden`/`auto` can still be reported
 * `visible` — that is exactly how the original regression escaped manual inspection.
 */

const LESSON_PATH = "/notes/software-libraries/what-is/";
const EPSILON_PX = 1;

// Deliberately short so this lesson's TOC entries overflow the panel and force real internal
// scrolling — see `playwright.config.ts` for why the project default is no longer this short.
test.use({ viewport: { width: 1600, height: 480 } });

interface Containment {
    itemTop: number;
    itemBottom: number;
    visibleTop: number;
    visibleBottom: number;
}

async function measureContainment(entry: Locator): Promise<Containment | null> {
    return entry.evaluate((entryEl) => {
        const scroller = entryEl.closest<HTMLElement>("[data-lesson-toc-scroll]");
        if (!scroller) return null;

        const item = entryEl.getBoundingClientRect();
        const container = scroller.getBoundingClientRect();
        const visibleTop = container.top + scroller.clientTop;
        const visibleBottom = visibleTop + scroller.clientHeight;

        return { itemTop: item.top, itemBottom: item.bottom, visibleTop, visibleBottom };
    });
}

function expectContained(containment: Containment | null): void {
    expect(containment).not.toBeNull();
    expect(containment!.itemTop).toBeGreaterThanOrEqual(containment!.visibleTop - EPSILON_PX);
    expect(containment!.itemBottom).toBeLessThanOrEqual(containment!.visibleBottom + EPSILON_PX);
}

async function scrollToEntry(page: import("@playwright/test").Page, entry: Locator): Promise<void> {
    const href = await entry.getAttribute("href");
    await page.locator(`#${href!.slice(1)}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
}

test.describe("lesson TOC auto-reveal", () => {
    test("the active entry stays fully inside the scrolling viewport across downward and upward traversal", async ({ page }) => {
        await page.goto(LESSON_PATH);

        const entries = page.locator(".lesson-toc-rail [data-lesson-toc-entry]");
        const count = await entries.count();
        expect(count).toBeGreaterThan(3);

        const heading = page.locator(".lesson-toc-rail [data-lesson-toc]").getByText("En esta página", { exact: true });
        const middleIndex = Math.floor(count / 2);
        // Deliberately not the very last entry: once the article's final section is scrolled to the
        // top of the viewport, the sticky shell's containing block can legitimately end before the
        // viewport does, unsticking it — a separate, pre-existing `position: sticky` characteristic,
        // not the coordinate-measurement regression this spec targets.
        const lateIndex = Math.max(middleIndex + 1, count - 2);
        const indices = [0, middleIndex, lateIndex];

        for (const index of indices) {
            const entry = entries.nth(index);
            await scrollToEntry(page, entry);
            await expect(heading).toBeVisible();
            expectContained(await measureContainment(entry));
            await expect(page.locator(".lesson-toc-rail [aria-current='location']")).toHaveCount(1);
        }

        for (const index of [...indices].reverse()) {
            const entry = entries.nth(index);
            await scrollToEntry(page, entry);
            expectContained(await measureContainment(entry));
        }
    });

    test("manual TOC scrolling is preserved until the active article section changes", async ({ page }) => {
        await page.goto(LESSON_PATH);

        const entries = page.locator(".lesson-toc-rail [data-lesson-toc-entry]");
        const count = await entries.count();
        const middleIndex = Math.floor(count / 2);
        const scroller = page.locator(".lesson-toc-rail [data-lesson-toc-scroll]");

        await scrollToEntry(page, entries.nth(middleIndex));

        // Reader manually scrolls the TOC panel away from the auto-revealed entry.
        await scroller.evaluate((el) => {
            el.scrollTop = 0;
        });
        const manualScrollTop = await scroller.evaluate((el) => el.scrollTop);

        // Re-run the scroll handler without moving the article (dispatching a scroll event with no
        // position change deterministically keeps the active section the same, avoiding a flaky
        // pixel-nudge that could accidentally cross into the next section's threshold).
        await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
        await page.waitForTimeout(100);

        expect(await scroller.evaluate((el) => el.scrollTop)).toBe(manualScrollTop);

        // The active article section changes: automatic reveal resumes.
        await scrollToEntry(page, entries.nth(middleIndex + 1));
        expectContained(await measureContainment(entries.nth(middleIndex + 1)));
    });

    test("an internal TOC reveal does not move the document viewport", async ({ page }) => {
        await page.goto(LESSON_PATH);

        const entries = page.locator(".lesson-toc-rail [data-lesson-toc-entry]");
        const count = await entries.count();
        await scrollToEntry(page, entries.nth(count - 1));

        const scrollYBefore = await page.evaluate(() => window.scrollY);
        await page.waitForTimeout(200);
        const scrollYAfter = await page.evaluate(() => window.scrollY);

        expect(scrollYAfter).toBe(scrollYBefore);
    });
});
