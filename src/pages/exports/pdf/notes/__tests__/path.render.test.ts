import { describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import {
    getLessonPdfExportEntries,
    type LessonExportManifestEntry,
} from "~/presentation/adapters/lesson-pdf-export";
import ExportNotesPage from "../[...path].astro";

describe("given the PDF export wrapper route", () => {
    test("then the installation export renders static export markers", async () => {
        const renderPage = await createAstroRenderer<{ entry: LessonExportManifestEntry }>(ExportNotesPage);
        const entry = getLessonPdfExportEntries().find((candidate) => candidate.route === "/notes/installation/");

        if (!entry) {
            throw new Error("Expected installation export entry.");
        }

        const html = await renderPage(
            { entry },
            {
                request: new Request("https://dibs.ravenhill.cl/exports/pdf/notes/installation/"),
            },
        );

        expect(html).toContain('meta name="robots" content="noindex, nofollow"');
        expect(html).toContain('data-export-role="document"');
        expect(html).toContain('data-export-mode="pdf"');
        expect(html).toContain('data-export-role="metadata"');
        expect(html).toContain('data-export-role="body"');
        expect(html).toContain('Herramientas necesarias y recomendadas');
        expect(html).not.toContain('client:load');
    });
});
