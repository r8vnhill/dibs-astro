/**
 * @file Render-contract tests for {@link NotesSection}.
 *
 * Characterizes the section-heading contract this component owns: the `title`/`Icon`/`headingLevel`
 * props render the same anchor/heading semantics as the previous manual `<Heading slot="heading">`
 * composition, while the `heading` slot remains a working escape hatch for rich headings and
 * unmigrated call sites.
 */

import NotesSection from "$layouts/NotesSection.astro";
import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, suite, test } from "vitest";

type NotesSectionProps = {
    id?: string;
    title?: string;
    Icon?: unknown;
    headingLevel?: "h2" | "h3" | "h4" | "h5" | "h6";
};

let renderNotesSection: Awaited<ReturnType<typeof createAstroRenderer<NotesSectionProps>>>;

function parseHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

beforeAll(async () => {
    renderNotesSection = await createAstroRenderer<NotesSectionProps>(NotesSection);
});

suite("given an id and a plain-text title", () => {
    describe("when rendered", () => {
        test("then it renders an h2 whose text matches title", async () => {
            const html = await renderNotesSection({ id: "h2-why", title: "¿Por qué usar bibliotecas?" });
            const doc = parseHtml(html);

            const heading = doc.querySelector("#h2-why h2");
            expect(heading).not.toBeNull();
            expect(heading?.textContent?.trim()).toBe("¿Por qué usar bibliotecas?");
        });

        test("then the section id and heading id are linked via aria-labelledby", async () => {
            const html = await renderNotesSection({ id: "h2-why", title: "¿Por qué usar bibliotecas?" });
            const doc = parseHtml(html);

            const section = doc.querySelector("#h2-why");
            const heading = doc.querySelector("#h2-why h2");

            expect(section?.getAttribute("aria-labelledby")).toBe("h2-why-heading");
            expect(heading?.getAttribute("id")).toBe("h2-why-heading");
        });

        test("then the body slot content is rendered after the heading", async () => {
            const html = await renderNotesSection(
                { id: "h2-why", title: "¿Por qué usar bibliotecas?" },
                { slots: { default: "<p>Body paragraph.</p>" } },
            );
            const doc = parseHtml(html);

            const section = doc.querySelector("#h2-why");
            expect(section?.innerHTML.indexOf("Body paragraph.")).toBeGreaterThan(
                section?.innerHTML.indexOf("</h2>") ?? -1,
            );
        });
    });
});

suite("given an explicit headingLevel override", () => {
    describe("when rendered", () => {
        test("then it renders the overridden heading tag instead of the h2 default", async () => {
            const html = await renderNotesSection({ id: "h3-nested", title: "Nested example", headingLevel: "h3" });
            const doc = parseHtml(html);

            expect(doc.querySelector("#h3-nested h3")).not.toBeNull();
            expect(doc.querySelector("#h3-nested h2")).toBeNull();
        });
    });
});

suite("given a heading slot instead of a title prop", () => {
    describe("when rendered", () => {
        test("then it renders the slotted heading and ignores the title prop", async () => {
            const html = await renderNotesSection(
                { id: "h2-rich", title: "Should be ignored" },
                { slots: { heading: "<h2 id=\"h2-rich-heading\">Rich <em>heading</em></h2>" } },
            );
            const doc = parseHtml(html);

            const heading = doc.querySelector("#h2-rich h2");
            expect(heading?.innerHTML).toContain("<em>heading</em>");
            expect(html).not.toContain("Should be ignored");
        });
    });
});

suite("given neither a title prop nor a heading slot", () => {
    describe("when rendered", () => {
        test("then no heading element is rendered", async () => {
            const html = await renderNotesSection(
                { id: "h2-headless" },
                { slots: { default: "<p>Body only.</p>" } },
            );
            const doc = parseHtml(html);

            expect(doc.querySelector("#h2-headless h2")).toBeNull();
            expect(html).toContain("Body only.");
        });
    });
});
