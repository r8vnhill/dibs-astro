import { describe, expect, test } from "vitest";
import { createExportReport, summarizeExportEntries } from "../lib/pdf-export-report.mjs";

describe("given PDF export report entries", () => {
    test("then summary counts exported, failed, and findings totals", () => {
        const entries = [
            { route: "/notes/a/", exportRoute: "/exports/pdf/notes/a/", url: "https://example.test/a/", outputPath: "dist/a.pdf", status: "exported", title: "A", findings: [] },
            { route: "/notes/b/", exportRoute: "/exports/pdf/notes/b/", url: "https://example.test/b/", outputPath: "dist/b.pdf", status: "failed", title: "B", findings: [{ code: "client-only", severity: "warning" }] },
        ] as const;

        expect(summarizeExportEntries(entries)).toEqual({
            selected: 2,
            exported: 1,
            failed: 1,
            findings: 1,
        });
    });

    test("then a report includes the computed summary", () => {
        const report = createExportReport({
            generatedAt: "2026-05-11T00:00:00.000Z",
            baseUrl: "http://127.0.0.1:4321/",
            outDir: "dist/exports/pdf",
            selection: { kind: "all" },
            entries: [],
        });

        expect(report.summary).toEqual({
            selected: 0,
            exported: 0,
            failed: 0,
            findings: 0,
        });
    });
});