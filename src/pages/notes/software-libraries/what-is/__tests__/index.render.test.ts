/**
 * @file Lightweight composition render test for the "what-is" library lesson.
 *
 * Characterizes stable section anchors and heading hierarchy so a NotesSection/callout/code-block/
 * citation authoring refactor cannot silently change rendered document structure. Intentionally not a
 * full-page snapshot: editorial prose changes should not need to touch this test.
 */

import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import WhatIsPage from "../index.astro";

function parseHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

describe.concurrent("Library 'what-is' lesson render", () => {
    test("keeps stable section anchors and heading hierarchy", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(WhatIsPage);
        const html = await renderPage(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/software-libraries/what-is/",
                ),
            },
        );
        const doc = parseHtml(html);

        // Scope to top-level lesson sections (excludes ConclusionsLayout's nested "key-points" /
        // "closing-reflection" sections, which are a separate, unmigrated authoring surface).
        const allSections = Array.from(doc.querySelectorAll("[data-lesson-section]"));
        const sections = allSections.filter(
            section => !section.parentElement?.closest("[data-lesson-section]"),
        );
        const anchors = sections.map(section => section.id);

        expect(anchors).toEqual([
            "h2-why",
            "h2-boundary",
            "h2-consumer-perspective",
            "h2-surface",
            "h2-contract",
            "h2-encapsulation",
            "h2-observable-change",
            "h2-stability",
            "conclusions",
        ]);

        const headings = sections.map(section => {
            const heading = section.querySelector("h2");
            return heading?.textContent?.trim();
        });

        expect(headings).toEqual([
            "¿Por qué usar bibliotecas?",
            "Una biblioteca tiene una frontera",
            "La biblioteca desde la perspectiva de quien la consume",
            "Superficie de API: ¿con qué puedo interactuar?",
            "Contrato: ¿en qué puedo confiar?",
            "Encapsulación: controlar de qué puede depender el exterior",
            "¿Qué cambios puede observar quien consume?",
            "Estabilidad: las dependencias externas crean compromisos",
            "Conclusiones",
        ]);

        // Only the migrated main sections (not ConclusionsLayout, which is out of scope here) are
        // expected to have their heading id auto-wired to aria-labelledby.
        for (const section of sections.slice(0, 8)) {
            expect(section.getAttribute("aria-labelledby")).toBe(`${section.id}-heading`);
            expect(section.querySelector("h2")?.id).toBe(`${section.id}-heading`);
        }
    });

    test("renders the Nim comparison as a native collapsed disclosure", async () => {
        const renderPage = await createAstroRenderer<Record<string, never>>(WhatIsPage);
        const html = await renderPage({}, {
            request: new Request("https://dibs.ravenhill.cl/notes/software-libraries/what-is/"),
        });
        const doc = parseHtml(html);
        const summary = Array.from(doc.querySelectorAll("summary")).find(element =>
            element.textContent?.includes("Comparación con Nim")
        );
        const disclosure = summary?.closest("details");

        expect(disclosure).not.toBeNull();
        expect(disclosure?.hasAttribute("open")).toBe(false);
        expect(summary?.textContent).toContain("más información en la declaración");
        expect(disclosure?.textContent).toContain("raises: []");
        expect(disclosure?.querySelector("code")?.textContent).toBeTruthy();
    });
});
