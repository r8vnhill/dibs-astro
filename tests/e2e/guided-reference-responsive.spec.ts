/**
 * Browser contract for the shared guided-reading surface.
 *
 * This deliberately checks behavior that render tests cannot establish: wrapping, theme readability, document
 * width, and preservation of explicit link targets at representative desktop and mobile widths.
 */
import { expect, test } from "@playwright/test";

const readingsPath = "/readings/scripting/task-graphs/";
const themes = ["light", "dark"] as const;
const viewports = [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 },
] as const;

for (const theme of themes) {
    for (const viewport of viewports) {
        test(`keeps guided references structured in ${theme} mode at ${viewport.name} width`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto(readingsPath);
            await page.evaluate((selectedTheme) => {
                document.documentElement.classList.toggle("dark", selectedTheme === "dark");
            }, theme);

            const references = page.locator("li[data-guided-reference=\"true\"]");
            await expect(references).toHaveCount(4);

            for (let index = 0; index < await references.count(); index += 1) {
                const reference = references.nth(index);

                await expect(reference.locator("[data-reference-identity]")).toBeVisible();
                await expect(reference.locator("[data-reading-guidance]")).toBeVisible();
                await expect(reference.locator("[data-reading-metadata]")).toBeVisible();
                await expect(reference.locator("[data-reading-guide-question]")).toBeVisible();
                await expect(reference.locator(":scope > a")).toHaveCount(0);
            }

            const widths = await page.evaluate(() => ({
                documentWidth: document.documentElement.scrollWidth,
                viewportWidth: document.documentElement.clientWidth,
            }));
            expect(widths.documentWidth).toBeLessThanOrEqual(widths.viewportWidth);
        });
    }
}
