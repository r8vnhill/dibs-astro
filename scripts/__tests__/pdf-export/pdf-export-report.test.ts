import { describe, expect, test } from "vitest";
import {
    collectExportFindings,
    createExportReport,
    hasFatalExportFindings,
    summarizeExportEntries,
} from "../../lib/pdf-export/report.mjs";

describe("given PDF export report entries", () => {
    test("then summary counts exported, failed, and findings totals", () => {
        const entries = [
            {
                route: "/notes/a/",
                exportRoute: "/exports/pdf/notes/a/",
                url: "https://example.test/a/",
                outputPath: "dist/a.pdf",
                status: "exported",
                title: "A",
                findings: [],
            },
            {
                route: "/notes/b/",
                exportRoute: "/exports/pdf/notes/b/",
                url: "https://example.test/b/",
                outputPath: "dist/b.pdf",
                status: "failed",
                title: "B",
                findings: [
                    { code: "client-only", severity: "warning" },
                    { code: "unresolved-todo", severity: "warning" },
                ],
                error: {
                    kind: "pdf-generation-failed",
                    message: "Preview returned an invalid response.",
                },
            },
        ] as const;

        expect(summarizeExportEntries(entries)).toEqual({
            selected: 2,
            exported: 1,
            failed: 1,
            findings: 2,
        });
    });

    test("then skipped entries only affect selected and findings totals today", () => {
        expect(summarizeExportEntries([
            { status: "skipped", findings: [{ code: "dry-run" }] },
        ])).toEqual({
            selected: 1,
            exported: 0,
            failed: 0,
            findings: 0,
        });
    });

    test("then empty entries produce the current zero summary shape", () => {
        expect(summarizeExportEntries([])).toEqual({
            selected: 0,
            exported: 0,
            failed: 0,
            findings: 0,
        });
    });

    test("then a report preserves the current top-level shape, summary, and entry ordering", () => {
        const exportedEntry = {
            route: "/notes/a/",
            exportRoute: "/exports/pdf/notes/a/",
            url: "https://example.test/a/",
            outputPath: "dist/a.pdf",
            status: "exported",
            title: "A",
            findings: [],
        };
        const failedEntry = {
            route: "/notes/b/",
            exportRoute: "/exports/pdf/notes/b/",
            url: "https://example.test/b/",
            outputPath: "dist/b.pdf",
            status: "failed",
            title: "B",
            findings: [{ code: "client-only", message: "Fallback content", severity: "warning" }],
            error: {
                kind: "pdf-generation-failed",
                message: "Preview returned an invalid response.",
            },
        };
        const report = createExportReport({
            generatedAt: "2026-05-11T00:00:00.000Z",
            baseUrl: "http://127.0.0.1:4321/",
            outDir: "dist/exports/pdf",
            selection: { kind: "route", value: "/notes/a/" },
            entries: [exportedEntry, failedEntry],
        });

        expect(report).toEqual({
            generatedAt: "2026-05-11T00:00:00.000Z",
            baseUrl: "http://127.0.0.1:4321/",
            outDir: "dist/exports/pdf",
            selection: { kind: "route", value: "/notes/a/" },
            summary: {
                selected: 2,
                exported: 1,
                failed: 1,
                findings: 1,
            },
            entries: [exportedEntry, failedEntry],
        });
    });

    test("then a report includes the current top-level shape and computed summary", () => {
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
        expect(report).toEqual({
            generatedAt: "2026-05-11T00:00:00.000Z",
            baseUrl: "http://127.0.0.1:4321/",
            outDir: "dist/exports/pdf",
            selection: { kind: "all" },
            summary: {
                selected: 0,
                exported: 0,
                failed: 0,
                findings: 0,
            },
            entries: [],
        });
    });

    test("then failed entries keep the current error nesting unchanged", () => {
        const failedEntry = {
            route: "/notes/b/",
            exportRoute: "/exports/pdf/notes/b/",
            url: "http://127.0.0.1:4321/exports/pdf/notes/b/",
            outputPath: "dist/exports/pdf/notes/b.pdf",
            status: "failed",
            title: "B",
            findings: [],
            error: {
                kind: "pdf-generation-failed",
                message: "Preview returned an invalid response.",
            },
        };
        const report = createExportReport({
            generatedAt: "2026-05-11T00:00:00.000Z",
            baseUrl: "http://127.0.0.1:4321/",
            outDir: "dist/exports/pdf",
            selection: { kind: "route", value: "/notes/b/" },
            entries: [failedEntry],
        });

        expect(report.entries).toEqual([failedEntry]);
        expect(report.summary).toEqual({
            selected: 1,
            exported: 0,
            failed: 1,
            findings: 0,
        });
    });

    test("then DOM findings are collected without normalizing current field names", () => {
        expect(collectExportFindings([
            { code: "client-only", message: "Fallback content", severity: "warning" },
            { code: "unknown", message: undefined, severity: undefined },
        ])).toEqual([
            { code: "client-only", message: "Fallback content", severity: "warning" },
            { code: "unknown", message: undefined, severity: undefined },
        ]);
    });

    test("then empty finding policy never makes findings fatal", () => {
        const report = reportWithFindings([{ code: "hidden-content" }]);

        expect(hasFatalExportFindings(report, { failOn: [] })).toBe(false);
    });

    test("then any finding policy follows the report summary count", () => {
        expect(hasFatalExportFindings(reportWithFindings([{ code: "unknown" }]), { failOn: "any" })).toBe(true);
        expect(hasFatalExportFindings(reportWithFindings([]), { failOn: "any" })).toBe(false);
    });

    test("then targeted finding policy matches configured normalized kinds only", () => {
        expect(hasFatalExportFindings(reportWithFindings([{ kind: "unresolved-todo" }]), {
            failOn: ["unresolved-todo"],
        })).toBe(true);
        expect(hasFatalExportFindings(reportWithFindings([{ kind: "hidden-content" }]), {
            failOn: ["unresolved-todo"],
        })).toBe(false);
    });

    test("then targeted finding policy supports current code fields and legacy aliases", () => {
        expect(hasFatalExportFindings(reportWithFindings([{ code: "client-only" }]), {
            failOn: ["client-only-island"],
        })).toBe(true);
        expect(hasFatalExportFindings(reportWithFindings([{ code: "unknown" }, {}]), {
            failOn: ["client-only-island"],
        })).toBe(false);
    });

    test("then targeted finding policy triggers when any matching finding is present", () => {
        expect(hasFatalExportFindings(reportWithFindings([{ kind: "hidden-content" }, { code: "client-only" }]), {
            failOn: ["client-only-island"],
        })).toBe(true);
    });

    test("then targeted finding policy does not mutate the report", () => {
        const report = reportWithFindings([{ code: "client-only" }]);
        const snapshot = JSON.stringify(report);

        hasFatalExportFindings(report, { failOn: ["client-only-island"] });

        expect(JSON.stringify(report)).toBe(snapshot);
    });
});

function reportWithFindings(findings: readonly Record<string, unknown>[]) {
    return {
        summary: {
            findings: findings.length,
        },
        entries: [
            {
                status: "exported",
                findings,
            },
        ],
    };
}
