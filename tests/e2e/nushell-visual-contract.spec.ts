import { expect, test } from "@playwright/test";

const lessonPath = "/notes/scripting/support-scripts/nushell/";
const themes = ["light", "dark"] as const;
const viewports = [
    { name: "desktop", width: 1280, height: 900 },
    { name: "narrow", width: 390, height: 844 },
] as const;

for (const theme of themes) {
    for (const viewport of viewports) {
        test(`keeps the Nushell diagnostic readable in ${theme} mode at ${viewport.name} width`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto(lessonPath);
            await page.evaluate((selectedTheme) => {
                document.documentElement.classList.toggle("dark", selectedTheme === "dark");
            }, theme);

            const diagnostic = page.locator("pre", { hasText: "nu::parser::input_type_mismatch" });
            const block = diagnostic.locator("xpath=ancestor::div[contains(@class, 'border')][1]");
            const body = diagnostic.locator("xpath=ancestor::div[contains(@class, 'relative')][1]");

            await expect(block).toContainText("Error de tipo");
            await expect(block.locator("svg")).toBeVisible();
            await expect(diagnostic).toContainText("nu::parser::input_type_mismatch");
            await expect(body).toHaveCSS(
                "background-color",
                theme === "dark" ? "rgb(71, 85, 105)" : "rgb(229, 231, 235)",
            );

            const copyButton = block.getByRole("button", { name: /copy/i });
            await expect(copyButton).toBeVisible();
            await expect(copyButton).toBeEnabled();
        });
    }
}

test("keeps wide Mermaid diagrams inside a local viewport and printable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(lessonPath);

    const diagram = page.locator("figure[data-diagram-id=\"persisted-representation-to-runtime-value\"]");
    const viewport = diagram.locator(".diagram-viewport");
    const metrics = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.querySelector<HTMLElement>(".diagram-viewport")?.scrollWidth ?? 0,
        viewportClientWidth: document.querySelector<HTMLElement>(".diagram-viewport")?.clientWidth ?? 0,
    }));

    await expect(diagram).toBeVisible();
    expect(metrics.viewportWidth).toBeGreaterThan(metrics.viewportClientWidth);
    expect(metrics.documentWidth).toBeLessThanOrEqual(390);
    await expect(viewport).toHaveCSS("overflow-x", "auto");

    await page.emulateMedia({ media: "print" });
    await expect(diagram.locator("svg")).toBeVisible();
    await expect(viewport).toHaveCSS("overflow-x", "visible");
});
