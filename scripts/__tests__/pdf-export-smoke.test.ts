import path from "node:path";

import { describe, expect, test } from "vitest";

import {
    assertPdfSmokeReport,
    createPdfSmokeWorkspace,
    readPdfSmokeConfig,
    resolvePdfSmokeEntry,
} from "../lib/pdf-export-smoke.mjs";

describe("pdf export smoke helpers", () => {
    test("requires explicit opt-in before running the smoke test", () => {
        expect(() => readPdfSmokeConfig({})).toThrow("Set EXPORT_PDF_SMOKE=1");
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

    test("builds repo-local temp workspace paths", () => {
        const workspace = createPdfSmokeWorkspace("e:/teaching/DIBS/projects/astro-website", "2026-05-11-abc123");

        expect(workspace.relativeRoot).toBe(path.posix.join("tmp", "pdf-export-smoke", "2026-05-11-abc123"));
        expect(workspace.relativeOutDir).toBe(path.posix.join("tmp", "pdf-export-smoke", "2026-05-11-abc123", "pdf"));
        expect(workspace.relativeReportPath).toBe(
            path.posix.join("tmp", "pdf-export-smoke", "2026-05-11-abc123", "report.json"),
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
});