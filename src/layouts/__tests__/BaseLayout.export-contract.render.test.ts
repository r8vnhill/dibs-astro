import BaseLayout from "$layouts/BaseLayout.astro";
import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, test } from "vitest";

const EXPORT_HIDDEN_SELECTOR = "[data-export-hidden='true']";

describe("BaseLayout export contract", () => {
    let renderBaseLayout: Awaited<ReturnType<typeof createAstroRenderer<{ pageTitle: string }>>>;

    beforeAll(async () => {
        renderBaseLayout = await createAstroRenderer<{ pageTitle: string }>(BaseLayout);
    });

    test("marks global chrome as export-hidden in PDF mode and removes the spacer", async () => {
        const html = await renderBaseLayout(
            { pageTitle: "Exportable lesson" },
            {
                locals: { lessonRenderMode: "pdf" },
                slots: {
                    default: "<div>Contenido de exportación</div>",
                },
            },
        );
        const doc = new JSDOM(html).window.document;

        expect(doc.querySelectorAll(EXPORT_HIDDEN_SELECTOR)).toHaveLength(2);
        expect(doc.querySelector("header")?.getAttribute("data-export-hidden")).toBe("true");
        expect(doc.querySelector("footer")?.getAttribute("data-export-hidden")).toBe("true");
        expect(html).toContain('name="robots" content="noindex, nofollow"');
        expect(html).not.toContain('class="w-full pt-16"');
        expect(html).toContain('id="main-content"');

        expect(doc.querySelector("main#main-content")?.className).not.toContain("pt-16");
    });

    test("keeps the header spacer in web mode and does not mark chrome as hidden", async () => {
        const html = await renderBaseLayout(
            { pageTitle: "Web lesson" },
            {
                locals: { lessonRenderMode: "web" },
                slots: {
                    default: "<div>Contenido web</div>",
                },
            },
        );

        expect(html).toContain('class="w-full pt-16"');
        expect(html).not.toContain('data-export-hidden="true"');
        expect(html).not.toContain('noindex, nofollow');
    });
});