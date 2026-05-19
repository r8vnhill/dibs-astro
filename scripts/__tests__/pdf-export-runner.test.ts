import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { preparePdfExportRun, runPdfExport } from "../lib/pdf-export-runner.mjs";

const manifestEntries = [
    {
        route: "/notes/blackthorne/androth/",
        exportRoute: "/exports/pdf/notes/blackthorne/androth/",
        title: "Blackthorne / Androth",
    },
    {
        route: "/notes/blackthorne/tuul/",
        exportRoute: "/exports/pdf/notes/blackthorne/tuul/",
        title: "Blackthorne / Tuul",
    },
];

const manifest = {
    generatedAt: "2026-05-11T00:00:00.000Z",
    entries: manifestEntries,
};

const resolvedTargets = [
    {
        entry: manifestEntries[0],
        outputPath: "dist/exports/pdf/blackthorne/androth.pdf",
    },
    {
        entry: manifestEntries[1],
        outputPath: "dist/exports/pdf/blackthorne/tuul.pdf",
    },
];

function createDependencies({ validationFindings = [] } = {}) {
    const buildLessonPdfExportManifest = vi.fn(() => ({
        manifest,
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
    const buildSite = vi.fn(async () => {});
    const startPreviewServer = vi.fn(() => ({ pid: 1234 }));
    const waitForPreview = vi.fn(async () => "http://127.0.0.1:4321/");
    const stopPreviewServer = vi.fn(async () => {});
    const exportPreparedTargets = vi.fn(async () => {});
    const logger = { log: vi.fn() };

    return {
        buildSite,
        buildLessonPdfExportManifest,
        selectExportEntries,
        resolveExportTargets,
        createExportReport,
        writeExportReport,
        startPreviewServer,
        waitForPreview,
        stopPreviewServer,
        exportPreparedTargets,
        now: () => new Date("2026-05-11T00:00:00.000Z"),
        logger,
    };
}

function createRealExportOptions(overrides = {}) {
    return {
        dryRun: false,
        outDir: "dist/exports/pdf",
        reportPath: "dist/exports/pdf/report.json",
        selection: { kind: "all" },
        baseUrl: undefined,
        port: 4321,
        timeoutMs: 30_000,
        skipBuild: false,
        keepServer: false,
        ...overrides,
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
                    "/exports/pdf/notes/blackthorne/androth/",
                    "/exports/pdf/notes/blackthorne/tuul/",
                ],
            },
            {
                name: "with baseUrl",
                baseUrl: "http://127.0.0.1:4321/",
                expectedReportBaseUrl: "http://127.0.0.1:4321/",
                expectedEntryUrls: [
                    "http://127.0.0.1:4321/exports/pdf/notes/blackthorne/androth/",
                    "http://127.0.0.1:4321/exports/pdf/notes/blackthorne/tuul/",
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
                manifest,
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

        test("then non-dry-run validation fails before selection and report creation", async () => {
            const dependencies = createDependencies({
                validationFindings: [
                    { severity: "error", message: "Missing title." },
                    { severity: "warning", message: "Ignored warning." },
                ],
            });

            await expect(runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options: {
                    dryRun: false,
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

    describe("when preparing a real export run", () => {
        test("then it returns the manifest, selected entries, and resolved targets", () => {
            const dependencies = createDependencies();
            const options = {
                dryRun: false,
                outDir: "dist/exports/pdf",
                reportPath: "dist/exports/pdf/report.json",
                selection: { kind: "all" },
            };

            expect(preparePdfExportRun({ options, dependencies })).toEqual({
                manifest,
                selectedEntries: manifestEntries,
                targets: resolvedTargets,
            });
            expect(dependencies.buildLessonPdfExportManifest).toHaveBeenCalledWith({
                outDir: options.outDir,
            });
            expect(dependencies.selectExportEntries).toHaveBeenCalledWith(
                manifest,
                options.selection,
            );
            expect(dependencies.resolveExportTargets).toHaveBeenCalledWith(
                manifestEntries,
                options.outDir,
            );
            expect(dependencies.createExportReport).not.toHaveBeenCalled();
            expect(dependencies.writeExportReport).not.toHaveBeenCalled();
        });

        test("then non-dry-run resolves targets before the temporary runner guard", async () => {
            const dependencies = createDependencies();
            const options = createRealExportOptions();

            await runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options,
                dependencies,
            });

            expect(dependencies.buildLessonPdfExportManifest).toHaveBeenCalledWith({
                outDir: options.outDir,
            });
            expect(dependencies.selectExportEntries).toHaveBeenCalledWith(
                manifest,
                options.selection,
            );
            expect(dependencies.resolveExportTargets).toHaveBeenCalledWith(
                manifestEntries,
                options.outDir,
            );
            expect(dependencies.createExportReport).not.toHaveBeenCalled();
            expect(dependencies.writeExportReport).not.toHaveBeenCalled();
            expect(dependencies.exportPreparedTargets).toHaveBeenCalledWith({
                targets: resolvedTargets,
                baseUrl: "http://127.0.0.1:4321/",
            });
        });
    });

    describe("when a real export uses a provided baseUrl", () => {
        test("then it normalizes the baseUrl and skips preview startup", async () => {
            const dependencies = createDependencies();
            const projectRoot = "e:/teaching/DIBS/projects/astro-website";
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/site/page/",
            });

            await runPdfExport({ projectRoot, options, dependencies });

            expect(dependencies.buildSite).toHaveBeenCalledWith({ projectRoot });
            expect(dependencies.startPreviewServer).not.toHaveBeenCalled();
            expect(dependencies.waitForPreview).not.toHaveBeenCalled();
            expect(dependencies.stopPreviewServer).not.toHaveBeenCalled();
            expect(dependencies.exportPreparedTargets).toHaveBeenCalledWith({
                targets: resolvedTargets,
                baseUrl: "http://127.0.0.1:5000/",
            });
        });

        test("then skipBuild prevents the build but still exports prepared targets", async () => {
            const dependencies = createDependencies();
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/",
                skipBuild: true,
            });

            await runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options,
                dependencies,
            });

            expect(dependencies.buildSite).not.toHaveBeenCalled();
            expect(dependencies.exportPreparedTargets).toHaveBeenCalledWith({
                targets: resolvedTargets,
                baseUrl: "http://127.0.0.1:5000/",
            });
        });
    });

    describe("when a real export needs a preview server", () => {
        test("then it builds, starts preview, waits for readiness, exports, and stops preview in order", async () => {
            const dependencies = createDependencies();
            const projectRoot = "e:/teaching/DIBS/projects/astro-website";
            const previewProcess = { pid: 9876 };
            dependencies.startPreviewServer.mockReturnValue(previewProcess);
            dependencies.waitForPreview.mockResolvedValue("http://127.0.0.1:4321/");
            const options = createRealExportOptions();

            await runPdfExport({ projectRoot, options, dependencies });

            expect(dependencies.buildSite).toHaveBeenCalledWith({ projectRoot });
            expect(dependencies.startPreviewServer).toHaveBeenCalledWith({
                projectRoot,
                port: 4321,
            });
            expect(dependencies.waitForPreview).toHaveBeenCalledWith(
                "http://127.0.0.1:4321/",
                30_000,
            );
            expect(dependencies.exportPreparedTargets).toHaveBeenCalledWith({
                targets: resolvedTargets,
                baseUrl: "http://127.0.0.1:4321/",
            });
            expect(dependencies.stopPreviewServer).toHaveBeenCalledWith(previewProcess);

            expect(dependencies.buildSite.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.startPreviewServer.mock.invocationCallOrder[0],
            );
            expect(dependencies.startPreviewServer.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.waitForPreview.mock.invocationCallOrder[0],
            );
            expect(dependencies.waitForPreview.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.exportPreparedTargets.mock.invocationCallOrder[0],
            );
            expect(dependencies.exportPreparedTargets.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.stopPreviewServer.mock.invocationCallOrder[0],
            );
        });

        test("then keepServer leaves a started preview running", async () => {
            const dependencies = createDependencies();
            const options = createRealExportOptions({ keepServer: true });

            await runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options,
                dependencies,
            });

            expect(dependencies.startPreviewServer).toHaveBeenCalledOnce();
            expect(dependencies.stopPreviewServer).not.toHaveBeenCalled();
        });

        test("then a build failure stops before preview startup", async () => {
            const dependencies = createDependencies();
            dependencies.buildSite.mockRejectedValue(new Error("Build failed."));

            await expect(runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options: createRealExportOptions(),
                dependencies,
            })).rejects.toThrow("Build failed.");

            expect(dependencies.startPreviewServer).not.toHaveBeenCalled();
            expect(dependencies.waitForPreview).not.toHaveBeenCalled();
            expect(dependencies.exportPreparedTargets).not.toHaveBeenCalled();
            expect(dependencies.stopPreviewServer).not.toHaveBeenCalled();
        });

        test("then preview stops when exporting prepared targets fails", async () => {
            const dependencies = createDependencies();
            const previewProcess = { pid: 2468 };
            dependencies.startPreviewServer.mockReturnValue(previewProcess);
            dependencies.exportPreparedTargets.mockRejectedValue(new Error("Export failed."));

            await expect(runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options: createRealExportOptions(),
                dependencies,
            })).rejects.toThrow("Export failed.");

            expect(dependencies.stopPreviewServer).toHaveBeenCalledWith(previewProcess);
        });
    });
});
