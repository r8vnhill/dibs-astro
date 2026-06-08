import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import {
    collectExportFindings,
    createExportReport,
    decidePdfExportExitCode,
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
            skipped: 0,
            findings: 2,
            findingsByKind: {
                "client-only-island": 1,
                "unresolved-todo": 1,
            },
            failuresByKind: {
                "pdf-generation-failed": 1,
            },
        });
    });

    test("then skipped entries only affect selected and findings totals today", () => {
        expect(summarizeExportEntries([
            { status: "skipped", findings: [{ code: "dry-run" }] },
        ])).toEqual({
            selected: 1,
            exported: 0,
            failed: 0,
            skipped: 1,
            findings: 0,
            findingsByKind: {},
            failuresByKind: {},
        });
    });

    test("then empty entries produce the current zero summary shape", () => {
        expect(summarizeExportEntries([])).toEqual({
            selected: 0,
            exported: 0,
            failed: 0,
            skipped: 0,
            findings: 0,
            findingsByKind: {},
            failuresByKind: {},
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
            exitPolicy: {
                continueOnError: false,
                failOn: [],
            },
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
                skipped: 0,
                findings: 1,
                findingsByKind: {
                    "client-only-island": 1,
                },
                failuresByKind: {
                    "pdf-generation-failed": 1,
                },
                exitPolicy: {
                    continueOnError: false,
                    failOn: [],
                },
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
            skipped: 0,
            findings: 0,
            findingsByKind: {},
            failuresByKind: {},
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
                skipped: 0,
                findings: 0,
                findingsByKind: {},
                failuresByKind: {},
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
            skipped: 0,
            findings: 0,
            findingsByKind: {},
            failuresByKind: {
                "pdf-generation-failed": 1,
            },
        });
    });

    test("then DOM findings are normalized with useful context", () => {
        const document = parseHtml(`
            <main data-export-role="document">
                <section data-export-role="body">
                    <aside data-testid="abstract-fallback" data-export-finding="client-only">
                        Fallback content
                    </aside>
                    <p data-export-finding="client-only-island" data-export-finding-severity="info">
                        Client-only island
                    </p>
                    <div data-export-finding="hidden-content" aria-label="Hidden navigation"></div>
                    <span data-export-finding="unresolved-todo">
                        ${"Pending ".repeat(30)}
                    </span>
                    <strong data-export-finding="unknown">Ignored</strong>
                </section>
            </main>
        `);

        expect(collectExportFindings(document, { route: "/notes/a/" })).toEqual([
            {
                kind: "client-only-island",
                severity: "warning",
                message: "client-only-island: Fallback content",
                route: "/notes/a/",
                source: "dom",
                selector: "[data-export-role=\"body\"] [data-export-finding=\"client-only\"]",
                excerpt: "Fallback content",
            },
            {
                kind: "client-only-island",
                severity: "info",
                message: "client-only-island: Client-only island",
                route: "/notes/a/",
                source: "dom",
                selector: "[data-export-role=\"body\"] [data-export-finding=\"client-only-island\"]",
                excerpt: "Client-only island",
            },
            {
                kind: "hidden-content",
                severity: "warning",
                message: "hidden-content: Hidden navigation",
                route: "/notes/a/",
                source: "dom",
                selector: "[data-export-role=\"body\"] [data-export-finding=\"hidden-content\"]",
                excerpt: undefined,
            },
            {
                kind: "unresolved-todo",
                severity: "warning",
                message:
                    "unresolved-todo: Pending Pending Pending Pending Pending Pending Pending Pending Pending Pending Pending Pending Pending Pending Pendi...",
                route: "/notes/a/",
                source: "dom",
                selector: "[data-export-role=\"body\"] [data-export-finding=\"unresolved-todo\"]",
                excerpt:
                    "Pending Pending Pending Pending Pending Pending Pending Pending Pending Pending Pending Pending Pending Pending Pendi...",
            },
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

    test.each([
        {
            name: "clean export",
            report: reportWithEntries([{ status: "exported", findings: [] }]),
            policy: { continueOnError: false, findingPolicy: { failOn: [] } },
            expected: 0,
        },
        {
            name: "partial failure by default",
            report: reportWithEntries([{ status: "exported" }, failedEntry()]),
            policy: { continueOnError: false, findingPolicy: { failOn: [] } },
            expected: 1,
        },
        {
            name: "partial failure with continue-on-error",
            report: reportWithEntries([{ status: "exported" }, failedEntry()]),
            policy: { continueOnError: true, findingPolicy: { failOn: [] } },
            expected: 0,
        },
        {
            name: "total failure with continue-on-error",
            report: reportWithEntries([failedEntry(), failedEntry()]),
            policy: { continueOnError: true, findingPolicy: { failOn: [] } },
            expected: 1,
        },
        {
            name: "fatal finding with continue-on-error",
            report: reportWithEntries([
                { status: "exported", findings: [{ kind: "unresolved-todo" }] },
            ]),
            policy: {
                continueOnError: true,
                findingPolicy: { failOn: ["unresolved-todo"] },
            },
            expected: 1,
        },
        {
            name: "successful dry-run without fatal findings",
            report: reportWithEntries([{ status: "skipped", findings: [] }]),
            policy: { continueOnError: true, findingPolicy: { failOn: [] } },
            expected: 0,
        },
    ])("then exit policy handles $name", ({ report, policy, expected }) => {
        expect(decidePdfExportExitCode(report, policy)).toBe(expected);
    });
});

function parseHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

function reportWithFindings(findings: readonly Record<string, unknown>[]) {
    return reportWithEntries([
        {
            status: "exported",
            findings,
        },
    ]);
}

function reportWithEntries(entries: readonly Record<string, unknown>[]) {
    return {
        summary: summarizeExportEntries(entries),
        entries,
    };
}

function failedEntry() {
    return {
        status: "failed",
        findings: [],
        error: {
            kind: "pdf-generation-failed",
        },
    };
}
