/**
 * Browser-level characterization for navigation, theme bootstrap, and export spacing.
 */
import { expect, type Page, test } from "@playwright/test";

const WEB_FIXTURE_PATH = "/dev-fixtures/base-layout-contract/";
const PDF_FIXTURE_PATH = "/dev-fixtures/base-layout-contract-pdf/";

type ThemeCase = {
    name: string;
    storedTheme?: string;
    prefersDark: boolean;
    storageUnavailable?: boolean;
    expectedDark: boolean;
};

const themeCases: ThemeCase[] = [
    { name: "stored dark with dark system preference", storedTheme: "dark", prefersDark: true, expectedDark: true },
    { name: "stored dark with light system preference", storedTheme: "dark", prefersDark: false, expectedDark: true },
    { name: "stored auto with dark system preference", storedTheme: "auto", prefersDark: true, expectedDark: true },
    { name: "stored auto with light system preference", storedTheme: "auto", prefersDark: false, expectedDark: false },
    { name: "stored light with dark system preference", storedTheme: "light", prefersDark: true, expectedDark: false },
    {
        name: "stored light with light system preference",
        storedTheme: "light",
        prefersDark: false,
        expectedDark: false,
    },
    { name: "absent preference with dark system preference", prefersDark: true, expectedDark: false },
    { name: "absent preference with light system preference", prefersDark: false, expectedDark: false },
    {
        name: "unrecognized preference with dark system preference",
        storedTheme: "sepia",
        prefersDark: true,
        expectedDark: false,
    },
    {
        name: "unrecognized preference with light system preference",
        storedTheme: "sepia",
        prefersDark: false,
        expectedDark: false,
    },
    {
        name: "unavailable storage with dark system preference",
        prefersDark: true,
        storageUnavailable: true,
        expectedDark: true,
    },
    {
        name: "unavailable storage with light system preference",
        prefersDark: false,
        storageUnavailable: true,
        expectedDark: false,
    },
];

function configureThemeEnvironment({ storedTheme, prefersDark, storageUnavailable }: ThemeCase) {
    Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: () => ({
            matches: prefersDark,
            media: "(prefers-color-scheme: dark)",
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
        }),
    });

    if (storageUnavailable) {
        Object.defineProperty(Storage.prototype, "getItem", {
            configurable: true,
            value: () => {
                throw new Error("storage unavailable");
            },
        });
        return;
    }

    localStorage.removeItem("theme");
    if (storedTheme !== undefined) localStorage.setItem("theme", storedTheme);
}

async function getMainPadding(page: Page, path: string) {
    await page.goto(path, { waitUntil: "networkidle" });
    return page.locator("main#main-content").evaluate((element) => getComputedStyle(element).paddingTop);
}

test.describe("BaseLayout observable browser contract", () => {
    test("keeps keyboard skip navigation connected to the main landmark", async ({ page }) => {
        await page.goto(WEB_FIXTURE_PATH, { waitUntil: "domcontentloaded" });

        await page.keyboard.press("Tab");
        await expect(page.locator("a[href='#main-content']")).toBeFocused();

        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/#main-content$/);
        await expect(page.locator("main#main-content")).toBeVisible();
    });

    for (const themeCase of themeCases) {
        test(`initializes the expected theme for ${themeCase.name}`, async ({ page }) => {
            await page.addInitScript(configureThemeEnvironment, themeCase);

            await page.goto(WEB_FIXTURE_PATH, { waitUntil: "domcontentloaded" });

            const darkAtDomContentLoaded = await page.locator("html").evaluate((element) =>
                element.classList.contains("dark")
            );
            expect(darkAtDomContentLoaded).toBe(themeCase.expectedDark);
        });
    }

    test("reserves the normal header offset but not in PDF mode", async ({ page }) => {
        const webPadding = await getMainPadding(page, WEB_FIXTURE_PATH);
        const pdfPadding = await getMainPadding(page, PDF_FIXTURE_PATH);

        expect(Number.parseFloat(webPadding)).toBeGreaterThan(0);
        expect(Number.parseFloat(pdfPadding)).toBe(0);
        await expect(page.locator("meta[name='robots'][content='noindex, nofollow']")).toHaveCount(1);
    });
});
