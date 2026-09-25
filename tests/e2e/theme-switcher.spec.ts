import { expect, test } from "@playwright/test";

const FIXTURE_PATH = "/dev-fixtures/base-layout-contract/";

const html = (page: import("@playwright/test").Page) => page.locator("html");
const storedTheme = (page: import("@playwright/test").Page) => page.evaluate(() => localStorage.getItem("theme"));

test.describe("Theme switcher observable browser contract", () => {
    test("selecting Dark then Light toggles the dark class and persists the choice", async ({ page }) => {
        await page.goto(FIXTURE_PATH, { waitUntil: "domcontentloaded" });

        const trigger = page.locator("[data-theme-trigger]");
        const menu = page.locator("[data-theme-options]");

        await trigger.click();
        await expect(menu).toBeVisible();
        await expect(trigger).toHaveAttribute("aria-expanded", "true");

        await page.locator("[data-theme-value='dark']").click();
        await expect(html(page)).toHaveClass(/\bdark\b/);
        await expect(menu).toBeHidden();
        expect(await storedTheme(page)).toBe("dark");

        await trigger.click();
        await page.locator("[data-theme-value='light']").click();
        await expect(html(page)).not.toHaveClass(/\bdark\b/);
        expect(await storedTheme(page)).toBe("light");
    });

    test("selecting Automatic follows the emulated system dark preference", async ({ page }) => {
        await page.emulateMedia({ colorScheme: "dark" });
        await page.goto(FIXTURE_PATH, { waitUntil: "domcontentloaded" });

        await page.locator("[data-theme-trigger]").click();
        await page.locator("[data-theme-value='auto']").click();

        await expect(html(page)).toHaveClass(/\bdark\b/);
        expect(await storedTheme(page)).toBe("auto");

        await page.emulateMedia({ colorScheme: "light" });
        await expect(html(page)).not.toHaveClass(/\bdark\b/);
    });

    test("a pointer press outside the control closes the menu", async ({ page }) => {
        await page.goto(FIXTURE_PATH, { waitUntil: "domcontentloaded" });

        await page.locator("[data-theme-trigger]").click();
        await expect(page.locator("[data-theme-options]")).toBeVisible();

        await page.mouse.click(5, 500);
        await expect(page.locator("[data-theme-options]")).toBeHidden();
    });
});
