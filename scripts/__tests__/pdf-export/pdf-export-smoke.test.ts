import path from "node:path";

import { describe, expect, test } from "vitest";

import {
    assertPdfSmokeReport,
    createPdfSmokeWorkspace,
    readPdfSmokeConfig,
    resolvePdfSmokeEntry,
} from "../../lib/pdf-export/smoke.mjs";

describe("pdf export smoke helpers", () => {
    test("requires explicit opt-in before running the smoke test", () => {
        expect(() => readPdfSmokeConfig({})).toThrow("Set EXPORT_PDF_SMOKE=1");
    });

    test("uses the current route and cleanup defaults when enabled", () => {
        expect(readPdfSmokeConfig({ EXPORT_PDF_SMOKE: "1" })).toEqual({
            route: "/notes/software-libraries/artifacts-taxonomy/",
            keepOutput: false,
        });
    });

    test("accepts current smoke environment overrides", () => {
        expect(readPdfSmokeConfig({
            EXPORT_PDF_SMOKE: "1",
            EXPORT_PDF_SMOKE_ROUTE: " /notes/installation/ ",
            EXPORT_PDF_SMOKE_KEEP_OUTPUT: "1",
        })).toEqual({
            route: "/notes/installation/",
            keepOutput: true,
        });
    });

    test("resolves the representative route from the manifest", () => {
        const manifest = {
            entries: [
                { route: "/notes/other/", outputPath: "tmp/pdf-export-smoke/run/pdf/other.pdf" },
                {
                    route: "/notes/software-libraries/artifacts-taxonomy/",
                    outputPath: "tmp/pdf-export-smoke/run/pdf/artifacts-taxonomy.pdf",
                },
            ],
        };

        expect(resolvePdfSmokeEntry(manifest).route).toBe("/notes/software-libraries/artifacts-taxonomy/");
        expect(resolvePdfSmokeEntry(manifest, "/notes/software-libraries/artifacts-taxonomy").route).toBe(
            "/notes/software-libraries/artifacts-taxonomy/",
        );
    });

    test("reports the current missing representative route message", () => {
        expect(() => resolvePdfSmokeEntry({ entries: [] }, "/notes/missing/")).toThrow(
            "No PDF smoke export entry found for /notes/missing/.",
        );
    });

    test("builds repo-local temp workspace paths", () => {
        const workspace = createPdfSmokeWorkspace("e:/teaching/DIBS/projects/astro-website", "2026-05-11-abc123");

        expect(workspace.relativeRoot).toBe(path.posix.join("tmp", "pdf-export-smoke", "2026-05-11-abc123"));
        expect(workspace.relativeOutDir).toBe(path.posix.join("tmp", "pdf-export-smoke", "2026-05-11-abc123", "pdf"));
        expect(workspace.relativeReportPath).toBe(
            path.posix.join("tmp", "pdf-export-smoke", "2026-05-11-abc123", "report.json"),
        );
        expect(workspace.absoluteRoot.replaceAll("\\", "/")).toBe(
            "e:/teaching/DIBS/projects/astro-website/tmp/pdf-export-smoke/2026-05-11-abc123",
        );
    });

    test("accepts a successful one-entry smoke report", () => {
        const expectedEntry = {
            route: "/notes/software-libraries/artifacts-taxonomy/",
            outputPath: "tmp/pdf-export-smoke/run/pdf/artifacts-taxonomy.pdf",
        };
        const report = {
            selection: { kind: "route", value: expectedEntry.route },
            summary: { selected: 1, exported: 1, failed: 0, findings: 0 },
            entries: [
                {
                    route: expectedEntry.route,
                    exportRoute: "/exports/pdf/notes/software-libraries/artifacts-taxonomy/",
                    outputPath: expectedEntry.outputPath,
                    status: "exported",
                    title: "Artifacts Taxonomy",
                    findings: [],
                },
            ],
        };

        expect(assertPdfSmokeReport(report, expectedEntry)).toMatchObject({ status: "exported" });
    });

    test("rejects the current failed smoke report shape", () => {
        const expectedEntry = {
            route: "/notes/software-libraries/artifacts-taxonomy/",
            outputPath: "tmp/pdf-export-smoke/run/pdf/artifacts-taxonomy.pdf",
        };
        const report = {
            selection: { kind: "route", value: expectedEntry.route },
            summary: { selected: 1, exported: 0, failed: 1, findings: 0 },
            entries: [
                {
                    route: expectedEntry.route,
                    outputPath: expectedEntry.outputPath,
                    status: "failed",
                    findings: [],
                    error: {
                        kind: "pdf-generation-failed",
                        message: "Preview returned an invalid response.",
                    },
                },
            ],
        };

        expect(() => assertPdfSmokeReport(report, expectedEntry)).toThrow(
            "PDF smoke report summary did not record one exported entry.",
        );
    });

    test("rejects current reports with mismatched output paths", () => {
        const expectedEntry = {
            route: "/notes/software-libraries/artifacts-taxonomy/",
            outputPath: "tmp/pdf-export-smoke/run/pdf/artifacts-taxonomy.pdf",
        };
        const report = {
            selection: { kind: "route", value: expectedEntry.route },
            summary: { selected: 1, exported: 1, failed: 0, findings: 0 },
            entries: [
                {
                    route: expectedEntry.route,
                    outputPath: "tmp/pdf-export-smoke/run/pdf/other.pdf",
                    status: "exported",
                    findings: [],
                },
            ],
        };

        expect(() => assertPdfSmokeReport(report, expectedEntry)).toThrow(
            "PDF smoke report output path did not match tmp/pdf-export-smoke/run/pdf/artifacts-taxonomy.pdf.",
        );
    });
});
