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
});
