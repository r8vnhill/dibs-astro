import { expect, test } from "@playwright/test";

const FIXTURE_PATH = "/dev-fixtures/base-layout-contract/";
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1024, height: 844 };

test.describe("Header navigation observable browser contract", () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test("opens the mobile navigation and locks background scrolling", async ({ page }) => {
        await page.goto(FIXTURE_PATH, { waitUntil: "domcontentloaded" });

        const toggle = page.locator("[data-nav-toggle]");
        const panel = page.locator("[data-nav-panel]");

        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await toggle.click();

        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await expect(panel).toBeVisible();
        await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
        await expect(panel.locator("a")).toHaveCount(5);
    });

    test("closes on Escape and restores focus and background scrolling", async ({ page }) => {
        await page.goto(FIXTURE_PATH, { waitUntil: "domcontentloaded" });

        const toggle = page.locator("[data-nav-toggle]");
        const panel = page.locator("[data-nav-panel]");

        await toggle.click();
        await expect(panel).toBeVisible();
        await panel.locator("a").first().focus();
        await page.keyboard.press("Escape");

        await expect(panel).toBeHidden();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await expect(toggle).toBeFocused();
        await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    });

    test("closes through outside dismissal", async ({ page }) => {
        await page.goto(FIXTURE_PATH, { waitUntil: "domcontentloaded" });

        const toggle = page.locator("[data-nav-toggle]");
        const panel = page.locator("[data-nav-panel]");

        await toggle.click();
        await expect(panel).toBeVisible();
        await page.mouse.click(10, 500);

        await expect(panel).toBeHidden();
        await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    });

    test("closes the mobile panel when the viewport crosses the shared desktop breakpoint", async ({ page }) => {
        await page.goto(FIXTURE_PATH, { waitUntil: "domcontentloaded" });

        const toggle = page.locator("[data-nav-toggle]");
        const panel = page.locator("[data-nav-panel]");
        const desktopLinks = page.locator(".desktop-nav-list a");

        await toggle.click();
        await expect(panel).toBeVisible();
        await page.setViewportSize(DESKTOP_VIEWPORT);

        await expect(toggle).toBeHidden();
        await expect(panel).toBeHidden();
        await expect(desktopLinks.first()).toBeVisible();
        await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    });
});
