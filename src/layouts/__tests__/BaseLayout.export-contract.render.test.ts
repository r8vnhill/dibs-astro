/**
 * Documents the DOM differences between browser rendering and lesson PDF rendering.
 */
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
        expect(doc.querySelector("meta[name='robots']")?.getAttribute("content")).toBe("noindex, nofollow");
        expect(doc.getElementById("main-content")).not.toBeNull();
        expect(doc.querySelector("main#main-content")?.textContent).toContain("Contenido de exportación");
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
        const doc = new JSDOM(html).window.document;

        expect(doc.querySelector("main#main-content")?.textContent).toContain("Contenido web");
        expect(doc.querySelectorAll(EXPORT_HIDDEN_SELECTOR)).toHaveLength(0);
        expect(doc.querySelector("meta[name='robots']")).toBeNull();
    });
});
