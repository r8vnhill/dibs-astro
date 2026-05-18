import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { runPdfExport } from "../lib/pdf-export-runner.mjs";

const manifestEntries = [
    {
        route: "/notes/civic-tv/unauthorized-signal/",
        exportRoute: "/exports/pdf/notes/civic-tv/unauthorized-signal/",
        title: "Videodrome / Faceplant",
    },
    {
        route: "/notes/spectacular-optical/new-flesh/",
        exportRoute: "/exports/pdf/notes/spectacular-optical/new-flesh/",
        title: "Videodrome / Ty Jonathan Down",
    },
];

const resolvedTargets = [
    {
        entry: manifestEntries[0],
        outputPath: "dist/exports/pdf/civic-tv/unauthorized-signal.pdf",
    },
    {
        entry: manifestEntries[1],
        outputPath: "dist/exports/pdf/spectacular-optical/new-flesh.pdf",
    },
];

function createDependencies({ validationFindings = [] } = {}) {
    const buildLessonPdfExportManifest = vi.fn(() => ({
        manifest: { generatedAt: "2026-05-11T00:00:00.000Z", entries: manifestEntries },
        validation: { findings: validationFindings },
    }));
    const selectExportEntries = vi.fn(() => manifestEntries);
    const resolveExportTargets = vi.fn(() => resolvedTargets);
    const createExportReport = vi.fn((input) => ({
        ...input,
        summary: {
            selected: input.entries.length,
            exported: 0,
            failed: 0,
            findings: 0,
        },
    }));
    const writeExportReport = vi.fn(async () => {});
    const logger = { log: vi.fn() };

    return {
        buildLessonPdfExportManifest,
        selectExportEntries,
        resolveExportTargets,
        createExportReport,
        writeExportReport,
        now: () => new Date("2026-05-11T00:00:00.000Z"),
        logger,
    };
}

describe("given the PDF export runner", () => {
    describe("when dry run is enabled", () => {
        test.each([
            {
                name: "without baseUrl",
                baseUrl: undefined,
                expectedReportBaseUrl: "dry-run",
                expectedEntryUrls: [
                    "/exports/pdf/notes/civic-tv/unauthorized-signal/",
                    "/exports/pdf/notes/spectacular-optical/new-flesh/",
                ],
            },
            {
                name: "with baseUrl",
                baseUrl: "http://127.0.0.1:4321/",
                expectedReportBaseUrl: "http://127.0.0.1:4321/",
                expectedEntryUrls: [
                    "http://127.0.0.1:4321/exports/pdf/notes/civic-tv/unauthorized-signal/",
                    "http://127.0.0.1:4321/exports/pdf/notes/spectacular-optical/new-flesh/",
                ],
            },
        ])("then %s writes a skipped-entry report without build, preview, or Chromium work", async ({
            baseUrl,
            expectedReportBaseUrl,
            expectedEntryUrls,
        }) => {
            const dependencies = createDependencies();
            const projectRoot = "e:/teaching/DIBS/projects/astro-website";
            const options = {
                dryRun: true,
                outDir: "dist/exports/pdf",
                reportPath: "dist/exports/pdf/report.json",
                baseUrl,
                selection: { kind: "all" },
            };

            await runPdfExport({ projectRoot, options, dependencies });

            expect(dependencies.buildLessonPdfExportManifest).toHaveBeenCalledWith({
                outDir: options.outDir,
            });
            expect(dependencies.selectExportEntries).toHaveBeenCalledWith(
                { generatedAt: "2026-05-11T00:00:00.000Z", entries: manifestEntries },
                options.selection,
            );
            expect(dependencies.resolveExportTargets).toHaveBeenCalledWith(
                manifestEntries,
                options.outDir,
            );

            const reportInput = dependencies.createExportReport.mock.calls[0][0];

            expect(reportInput).toEqual({
                generatedAt: "2026-05-11T00:00:00.000Z",
                baseUrl: expectedReportBaseUrl,
                outDir: options.outDir,
                selection: options.selection,
                entries: [
                    {
                        route: manifestEntries[0].route,
                        exportRoute: manifestEntries[0].exportRoute,
                        url: expectedEntryUrls[0],
                        outputPath: resolvedTargets[0].outputPath,
                        status: "skipped",
                        title: manifestEntries[0].title,
                        findings: [],
                    },
                    {
                        route: manifestEntries[1].route,
                        exportRoute: manifestEntries[1].exportRoute,
                        url: expectedEntryUrls[1],
                        outputPath: resolvedTargets[1].outputPath,
                        status: "skipped",
                        title: manifestEntries[1].title,
                        findings: [],
                    },
                ],
            });

            expect(dependencies.writeExportReport).toHaveBeenCalledWith(
                path.resolve(projectRoot, options.reportPath),
                expect.objectContaining({
                    summary: { selected: 2, exported: 0, failed: 0, findings: 0 },
                }),
            );
            expect(dependencies.logger.log).toHaveBeenCalledWith(
                "[export-lessons-pdf] Dry run selected 2 lesson(s).",
            );
        });
    });

    describe("when manifest validation fails", () => {
        test("then it fails before writing the dry-run report", async () => {
            const dependencies = createDependencies({
                validationFindings: [
                    { severity: "error", message: "Missing title." },
                    { severity: "warning", message: "Ignored warning." },
                ],
            });

            await expect(runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options: {
                    dryRun: true,
                    outDir: "dist/exports/pdf",
                    reportPath: "dist/exports/pdf/report.json",
                    selection: { kind: "all" },
                },
                dependencies,
            })).rejects.toThrow("PDF lesson export manifest is invalid:\n- Missing title.");

            expect(dependencies.selectExportEntries).not.toHaveBeenCalled();
            expect(dependencies.resolveExportTargets).not.toHaveBeenCalled();
            expect(dependencies.createExportReport).not.toHaveBeenCalled();
            expect(dependencies.writeExportReport).not.toHaveBeenCalled();
        });
    });
});