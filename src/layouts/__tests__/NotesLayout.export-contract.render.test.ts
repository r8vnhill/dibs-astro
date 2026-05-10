/**
 * @file Render-contract tests for the lesson PDF export HTML markers.
 *
 * These tests lock the Phase 1 export contract only. They do not assert PDF output, print CSS,
 * export routes, or export-mode rendering.
 */

import { queryRequired } from "$layouts/__tests__/fixtures/navigation-queries";
import { createNotesLayoutHarness } from "$layouts/__tests__/fixtures/notes-layout-harness";
import NotesLayout from "$layouts/NotesLayout.astro";
import type { NotesLayoutProps } from "$layouts/NotesLayout.props";
import { createAstroRenderer } from "$test-utils/astro-render";
import { beforeAll, describe, expect, test } from "vitest";

const EXPORT_DOCUMENT_SELECTOR = "[data-export-role='document']";
const EXPORT_METADATA_SELECTOR = "[data-export-role='metadata']";
const EXPORT_BODY_SELECTOR = "[data-export-role='body']";
const EXPORT_HIDDEN_SELECTOR = "[data-export-hidden='true']";
const CLIENT_ONLY_FINDING_SELECTOR = "[data-export-finding='client-only']";

describe("NotesLayout export contract", () => {
    let renderNotes: ReturnType<typeof createNotesLayoutHarness>["renderNotes"];
    let parseHtml: ReturnType<typeof createNotesLayoutHarness>["parseHtml"];

    beforeAll(async () => {
        const renderLayout = await createAstroRenderer<NotesLayoutProps>(NotesLayout);
        const harness = createNotesLayoutHarness(renderLayout);

        renderNotes = harness.renderNotes;
        parseHtml = harness.parseHtml;
    });

    test("renders exactly one exportable lesson document root", async () => {
        const html = await renderNotes({ title: "Exportable lesson" });
        const doc = parseHtml(html);
        const documents = doc.querySelectorAll(EXPORT_DOCUMENT_SELECTOR);

        expect(documents).toHaveLength(1);
        expect(documents[0]?.textContent).toContain("Exportable lesson");
        expect(documents[0]?.querySelector(EXPORT_BODY_SELECTOR)).not.toBeNull();
    });

    test("renders authored abstract and default content inside the export body in order", async () => {
        const html = await renderNotes(
            { title: "Exportable lesson" },
            {
                slots: {
                    abstract: "<p>Export abstract content.</p>",
                    default: "<section><p>Export body content.</p></section>",
                },
            },
        );
        const doc = parseHtml(html);
        const bodies = doc.querySelectorAll(EXPORT_BODY_SELECTOR);
        const body = queryRequired<HTMLElement>(doc, EXPORT_BODY_SELECTOR);

        expect(bodies).toHaveLength(1);
        expect(body.textContent).toContain("Export abstract content.");
        expect(body.textContent).toContain("Export body content.");
        expect(body.textContent?.indexOf("Export abstract content.")).toBeLessThan(
            body.textContent?.indexOf("Export body content.") ?? -1,
        );
        expect(body.querySelector("[data-testid='lesson-sidebar-panel']")).toBeNull();
        expect(body.querySelector("nav[aria-label='Siguiente o anterior lección']")).toBeNull();
    });

    test("marks lesson metadata as export-relevant without exposing infrastructure fields", async () => {
        const html = await renderNotes(
            { title: "Introducción a PowerShell" },
            { pathname: "/notes/scripting/" },
        );
        const doc = parseHtml(html);
        const metadataRegions = doc.querySelectorAll(EXPORT_METADATA_SELECTOR);
        const metadata = queryRequired<HTMLElement>(doc, EXPORT_METADATA_SELECTOR);

        expect(metadataRegions).toHaveLength(1);
        expect(metadata.textContent).toContain("Metadatos de la lección");
        expect(metadata.textContent).toContain("Autoría:");
        expect(metadata.textContent).toContain("Última actualización:");
        expect(metadata.textContent).not.toContain("sourceFile");
    });

    test("preserves document and body markers when optional metadata is missing", async () => {
        const html = await renderNotes(
            { title: "Unknown export lesson" },
            { pathname: "/notes/not-in-metadata/" },
        );
        const doc = parseHtml(html);

        expect(doc.querySelectorAll(EXPORT_DOCUMENT_SELECTOR)).toHaveLength(1);
        expect(doc.querySelectorAll(EXPORT_BODY_SELECTOR)).toHaveLength(1);
        expect(doc.querySelector(EXPORT_METADATA_SELECTOR)).toBeNull();
    });

    test("marks browser-only chrome as outside the export contract", async () => {
        const html = await renderNotes({
            title: "Exportable lesson",
            previous: {
                title: "Previous lesson",
                href: "/notes/previous/",
            },
            next: {
                title: "Next lesson",
                href: "/notes/next/",
            },
        });
        const doc = parseHtml(html);
        const hiddenRegions = Array.from(doc.querySelectorAll(EXPORT_HIDDEN_SELECTOR));

        expect(hiddenRegions.length).toBeGreaterThanOrEqual(3);
        expect(hiddenRegions.some((region) => region.querySelector("[data-testid='lesson-sidebar-panel']"))).toBe(true);
        expect(
            hiddenRegions.some((region) => region.matches("nav[aria-label='Siguiente o anterior lección']")),
        ).toBe(true);
    });

    test("marks unresolved abstract fallback content as a client-only export finding", async () => {
        const html = await renderNotes(
            { title: "Exportable lesson" },
            {
                slots: {
                    default: "<p>Body without an abstract slot.</p>",
                },
            },
        );
        const doc = parseHtml(html);
        const finding = queryRequired<HTMLElement>(doc, CLIENT_ONLY_FINDING_SELECTOR);
        const body = queryRequired<HTMLElement>(doc, EXPORT_BODY_SELECTOR);

        expect(finding.dataset.testid).toBe("abstract-fallback");
        expect(body.contains(finding)).toBe(true);
        expect(doc.querySelectorAll(CLIENT_ONLY_FINDING_SELECTOR)).toHaveLength(1);
    });
});
