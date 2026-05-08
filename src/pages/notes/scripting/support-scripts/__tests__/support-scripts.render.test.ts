import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import SupportScriptsPage from "../index.astro";

describe.concurrent("support scripts lesson render", () => {
    test("renders the reusable support scripts lesson", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(SupportScriptsPage);

        const html = await renderPage(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/scripting/support-scripts/",
                ),
            },
        );

        expect(html).toContain("Scripts de apoyo como software reusable");
        expect(html).toContain("/notes/scripting/support-scripts/");
        expect(html).toContain("contrato operativo");
        expect(html).toContain("check-library-layout.main.kts");
        expect(html).toContain("README.md");
        expect(html).toContain("LICENSE");
        expect(html).toContain("CODE_OF_CONDUCT.md");

        const document = new JSDOM(html).window.document;
        const sourceLink = document.querySelector<HTMLAnchorElement>(
            'a[href*="dibs-course/kotlin-companion"]',
        );
        expect(sourceLink?.href).toContain("scripts/check-library-layout.main.kts");
        expect(sourceLink?.textContent).toContain("scripts/check-library-layout.main.kts");

        const text = document.body.textContent ?? "";
        expect(text).toContain("kotlin check-library-layout.main.kts .");
        expect(text).toContain("contrato operativo del script");
        expect(text).toContain("fun checkPath");
        expect(text).toContain("args.isNotEmpty()");
        expect(text).not.toContain("data class");
        expect(text).not.toContain("Files.walk");
    });
});
