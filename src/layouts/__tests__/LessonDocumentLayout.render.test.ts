import { queryRequired } from "$layouts/__tests__/fixtures/navigation-queries";
import LessonDocumentLayout from "$layouts/LessonDocumentLayout.astro";
import type { LessonDocumentLayoutProps } from "$layouts/LessonDocumentLayout.props";
import type { LessonMetaPanelMetadata } from "$presentation/adapters/lesson-metadata-panel";
import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, test } from "vitest";

const EXPORT_DOCUMENT_SELECTOR = "[data-export-role='document']";
const EXPORT_METADATA_SELECTOR = "[data-export-role='metadata']";
const EXPORT_BODY_SELECTOR = "[data-export-role='body']";
const CLIENT_ONLY_FINDING_SELECTOR = "[data-export-finding='client-only']";
const REPO_PANEL_SELECTOR = "section[aria-labelledby='lesson-repo-panel-heading']";

const parseHtml = (html: string): Document => new JSDOM(html).window.document;

const metadataFixture: LessonMetaPanelMetadata = {
    authors: [
        { name: "Ada Lovelace" },
    ],
    changes: [],
    lastModified: "2026-05-10T00:00:00.000Z",
};

function expectTextOrder(html: string, ...expectedTexts: string[]): void {
    const indexes = expectedTexts.map((text) => html.indexOf(text));

    expect(indexes).not.toContain(-1);

    for (let index = 1; index < indexes.length; index += 1) {
        expect(indexes[index]).toBeGreaterThan(indexes[index - 1]);
    }
}

describe("LessonDocumentLayout.astro render", () => {
    let renderDocument: ReturnType<typeof createAstroRenderer<LessonDocumentLayoutProps>>;

    beforeAll(async () => {
        renderDocument = createAstroRenderer<LessonDocumentLayoutProps>(LessonDocumentLayout);
    });

    test("renders exactly one exportable lesson document root and body", async () => {
        const html = await (await renderDocument)({ title: "Exportable lesson" });
        const doc = parseHtml(html);

        expect(doc.querySelectorAll(EXPORT_DOCUMENT_SELECTOR)).toHaveLength(1);
        expect(doc.querySelectorAll(EXPORT_BODY_SELECTOR)).toHaveLength(1);
        expect(doc.querySelector(EXPORT_DOCUMENT_SELECTOR)?.textContent).toContain("Exportable lesson");
    });

    test("renders authored abstract content before the default body", async () => {
        const html = await (await renderDocument)(
            { title: "Exportable lesson" },
            {
                slots: {
                    abstract: "<p>Document abstract.</p>",
                    default: "<p>Document body.</p>",
                },
            },
        );
        const body = queryRequired<HTMLElement>(parseHtml(html), EXPORT_BODY_SELECTOR);

        expect(body.textContent).toContain("Document abstract.");
        expect(body.textContent).toContain("Document body.");
        expect(body.textContent?.indexOf("Document abstract.")).toBeLessThan(
            body.textContent?.indexOf("Document body.") ?? -1,
        );
    });

    test("renders after-title content between the title and metadata", async () => {
        const html = await (await renderDocument)(
            {
                title: "Exportable lesson",
                metadata: metadataFixture,
            },
            {
                slots: {
                    "after-title": "<p>After-title marker.</p>",
                },
            },
        );

        expectTextOrder(
            html,
            "Exportable lesson",
            "After-title marker.",
            "Metadatos de la lección",
        );
    });

    test("marks the abstract fallback as a client-only export finding", async () => {
        const html = await (await renderDocument)(
            { title: "Exportable lesson" },
            { slots: { default: "<p>Body without abstract.</p>" } },
        );
        const doc = parseHtml(html);
        const body = queryRequired<HTMLElement>(doc, EXPORT_BODY_SELECTOR);
        const finding = queryRequired<HTMLElement>(doc, CLIENT_ONLY_FINDING_SELECTOR);

        expect(finding.dataset.testid).toBe("abstract-fallback");
        expect(body.contains(finding)).toBe(true);
        expect(doc.querySelectorAll(CLIENT_ONLY_FINDING_SELECTOR)).toHaveLength(1);
    });

    test("renders metadata in the export metadata region when provided", async () => {
        const html = await (await renderDocument)({
            title: "Exportable lesson",
            metadata: metadataFixture,
        });
        const doc = parseHtml(html);
        const metadata = queryRequired<HTMLElement>(doc, EXPORT_METADATA_SELECTOR);

        expect(doc.querySelectorAll(EXPORT_METADATA_SELECTOR)).toHaveLength(1);
        expect(metadata.textContent).toContain("Metadatos de la lección");
        expect(metadata.textContent).toContain("Ada Lovelace");
    });

    test("omits the metadata region when metadata is absent", async () => {
        const html = await (await renderDocument)({ title: "Exportable lesson" });
        const doc = parseHtml(html);

        expect(doc.querySelector(EXPORT_METADATA_SELECTOR)).toBeNull();
    });

    test("renders the repository panel inside the document when git data is provided", async () => {
        const html = await (await renderDocument)({
            title: "Exportable lesson",
            git: { user: "r8vnhill", repo: "dibs-scripts" },
        });
        const doc = parseHtml(html);
        const documentRoot = queryRequired<HTMLElement>(doc, EXPORT_DOCUMENT_SELECTOR);
        const repoPanel = queryRequired<HTMLElement>(doc, REPO_PANEL_SELECTOR);

        expect(documentRoot.contains(repoPanel)).toBe(true);
        expect(repoPanel.textContent).toContain("Encuentra el código de la lección:");
    });

    describe("export mode", () => {
        test("web mode does not add data-export-mode attribute", async () => {
            const html = await (await renderDocument)({
                title: "Web mode lesson",
                renderMode: "web",
            });
            const doc = parseHtml(html);
            const documentRoot = queryRequired<HTMLElement>(doc, EXPORT_DOCUMENT_SELECTOR);

            expect(documentRoot.dataset.exportMode).toBeUndefined();
            expect(documentRoot.dataset.exportRole).toBe("document");
        });

        test("pdf mode adds data-export-mode attribute to document root", async () => {
            const html = await (await renderDocument)({
                title: "PDF export lesson",
                renderMode: "pdf",
            });
            const doc = parseHtml(html);
            const documentRoot = queryRequired<HTMLElement>(doc, EXPORT_DOCUMENT_SELECTOR);

            expect(documentRoot.dataset.exportMode).toBe("pdf");
            expect(documentRoot.dataset.exportRole).toBe("document");
        });

        test("legacy exportMode: true maps to PDF mode markers", async () => {
            const html = await (await renderDocument)({
                title: "Legacy PDF lesson",
                exportMode: true,
            });
            const doc = parseHtml(html);
            const documentRoot = queryRequired<HTMLElement>(doc, EXPORT_DOCUMENT_SELECTOR);

            expect(documentRoot.dataset.exportMode).toBe("pdf");
        });

        test("renderMode prop takes precedence over legacy exportMode", async () => {
            const html = await (await renderDocument)({
                title: "Priority test",
                renderMode: "web",
                exportMode: true,
            });
            const doc = parseHtml(html);
            const documentRoot = queryRequired<HTMLElement>(doc, EXPORT_DOCUMENT_SELECTOR);

            expect(documentRoot.dataset.exportMode).toBeUndefined();
        });

        test("renders static placeholder in PDF mode instead of reactive ToDo", async () => {
            const html = await (await renderDocument)({
                title: "PDF lesson without abstract",
                renderMode: "pdf",
            });
            const doc = parseHtml(html);
            const finding = queryRequired<HTMLElement>(doc, CLIENT_ONLY_FINDING_SELECTOR);
            const placeholder = finding.querySelector("aside[data-export-hidden]");

            expect(placeholder).toBeTruthy();
            expect(placeholder?.textContent).toContain("Contenido pendiente de completar");
            expect(html).not.toContain("initStarwindTabs");
            expect(html).not.toContain("client:only");
        });

        test("omits reactive ToDo component in PDF mode", async () => {
            const html = await (await renderDocument)({
                title: "PDF export",
                renderMode: "pdf",
            });

            // The reactive ToDo should not be rendered in PDF mode
            expect(html).not.toContain("TODO: Estamos");
        });
    });
});
