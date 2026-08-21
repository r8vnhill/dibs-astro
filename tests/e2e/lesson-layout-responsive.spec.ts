import { expect, test } from "@playwright/test";

const LESSON_PATH = "/notes/software-libraries/what-is/";

test.describe("lesson layout responsive prioritization", () => {
    test("wide desktop keeps both navigation rails beside the article", async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 900 });
        await page.goto(LESSON_PATH);

        await expect(page.locator("[data-testid='lesson-sidebar-panel']:visible")).toHaveCount(1);
        await expect(page.locator(".lesson-toc-rail")).toBeVisible();
        await expect(page.locator(".lesson-toc-mobile")).toBeHidden();
    });

    test("medium desktop keeps the page TOC and moves course navigation into a disclosure", async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(LESSON_PATH);

        await expect(page.locator(".lesson-toc-rail")).toBeVisible();
        await expect(page.locator(".lesson-toc-mobile")).toBeHidden();
        await expect(page.locator("summary").filter({ hasText: "Navegación del curso" })).toBeVisible();
    });

    test("small screens keep the article readable and expose both navigation disclosures", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(LESSON_PATH);

        await expect(page.locator(".lesson-toc-rail")).toBeHidden();
        await expect(page.locator(".lesson-toc-mobile")).toBeVisible();
        await expect(page.locator("summary").filter({ hasText: "Navegación del curso" })).toBeVisible();

        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});
