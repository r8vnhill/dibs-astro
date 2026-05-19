import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { preparePdfExportRun, runPdfExport } from "../../lib/pdf-export/runner.mjs";

// cSpell:words androth blackthorne domcontentloaded tuul

type EventLog = string[];

type ValidationFinding = {
    severity: string;
    message: string;
};

type ReportEntry = {
    status: string;
    findings?: unknown[];
};

type ReportInput = {
    entries: ReportEntry[];
};

type FindingElement = {
    getAttribute: (attribute: string) => string | null;
    dataset: {
        exportFinding?: string;
        exportFindingSeverity?: string;
    };
    textContent?: string | null;
};

type PageDouble = ReturnType<typeof createPageDouble>;

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

function createReport(input: ReportInput) {
    return {
        ...input,
        summary: {
            selected: input.entries.length,
            exported: input.entries.filter((entry) => entry.status === "exported").length,
            failed: input.entries.filter((entry) => entry.status === "failed").length,
            findings: input.entries.reduce(
                (total, entry) => total + (entry.findings?.length ?? 0),
                0,
            ),
        },
    };
}

function createDependencies({
    validationFindings = [],
}: { validationFindings?: ValidationFinding[] } = {}) {
    const buildLessonPdfExportManifest = vi.fn(() => ({
        manifest,
        validation: { findings: validationFindings },
    }));
    const selectExportEntries = vi.fn(() => manifestEntries);
    const resolveExportTargets = vi.fn(() => resolvedTargets);
    const createExportReport = vi.fn((input: ReportInput) => createReport(input));
    const writeExportReport = vi.fn(async () => {});
    const buildSite = vi.fn(async () => {});
    const startPreviewServer = vi.fn(() => ({ pid: 1234 }));
    const waitForPreview = vi.fn(async () => "http://127.0.0.1:4321/");
    const stopPreviewServer = vi.fn(async () => {});
    const chromium = {
        launch: vi.fn(async () => createBrowserDouble([createPageDouble(), createPageDouble()])),
    };
    const mkdir = vi.fn(async () => {});
    const hasFatalExportFindings = vi.fn(() => false);
    const logger = { log: vi.fn() };

    return {
        buildSite,
        buildLessonPdfExportManifest,
        chromium,
        createExportReport,
        hasFatalExportFindings,
        logger,
        mkdir,
        resolveExportTargets,
        selectExportEntries,
        startPreviewServer,
        stopPreviewServer,
        waitForPreview,
        writeExportReport,
        now: () => new Date("2026-05-11T00:00:00.000Z"),
    };
}

function createBrowserDouble(
    pages: PageDouble[] = [createPageDouble()],
    { events = [] }: { events?: EventLog } = {},
) {
    const pageQueue = [...pages];

    return {
        newPage: vi.fn(async () => {
            const page = pageQueue.shift();
            if (!page) {
                throw new Error("No more pages available.");
            }

            return page;
        }),
        close: vi.fn(async () => {
            events.push("browser-close");
        }),
    };
}

function createPageDouble({
    events = [],
    findingElements = [],
    gotoImplementation,
    label = "page",
    pdfImplementation,
    response = { ok: () => true },
}: {
    events?: EventLog;
    findingElements?: FindingElement[];
    gotoImplementation?: () => Promise<unknown>;
    label?: string;
    pdfImplementation?: () => Promise<void>;
    response?: { ok: () => boolean };
} = {}) {
    const locators = new Map();

    return {
        goto: vi.fn(gotoImplementation ?? (async () => response)),
        pdf: vi.fn(
            pdfImplementation ?? (async () => {
                events.push(`export-ok:${label}`);
            }),
        ),
        close: vi.fn(async () => {
            events.push(`page-close:${label}`);
        }),
        locator: vi.fn((selector: string) => {
            if (!locators.has(selector)) {
                locators.set(selector, createLocatorDouble(selector, findingElements));
            }

            return locators.get(selector);
        }),
    };
}

function createLocatorDouble(selector: string, findingElements: FindingElement[]) {
    if (selector === "[data-export-finding]") {
        return {
            waitFor: vi.fn(async () => {}),
            evaluateAll: vi.fn(async (callback: (elements: FindingElement[]) => unknown) => callback(findingElements)),
        };
    }

    return {
        waitFor: vi.fn(async () => {}),
        evaluateAll: vi.fn(async () => []),
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

function finalFailureMessage({
    hasFatalFindings = false,
    generationFailureCount = 0,
}: {
    hasFatalFindings?: boolean;
    generationFailureCount?: number;
}) {
    const bullets = [];

    if (hasFatalFindings) {
        bullets.push("- export findings matched the configured --fail-on policy");
    }

    if (generationFailureCount > 0) {
        bullets.push(`- PDF generation failed for ${generationFailureCount} lesson(s)`);
    }

    return [
        "PDF export completed with problems after writing the report:",
        ...bullets,
        "Report: dist/exports/pdf/report.json",
    ].join("\n");
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
    });

    describe("when a real export uses a provided baseUrl", () => {
        test("then it normalizes the baseUrl and skips preview startup", async () => {
            const dependencies = createDependencies();
            const projectRoot = "e:/teaching/DIBS/projects/astro-website";
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/site/page/",
            });
            const firstPage = createPageDouble();
            const secondPage = createPageDouble();
            const browser = createBrowserDouble([firstPage, secondPage]);
            dependencies.chromium.launch.mockResolvedValue(browser);

            await runPdfExport({ projectRoot, options, dependencies });

            expect(dependencies.buildSite).toHaveBeenCalledWith({ projectRoot });
            expect(dependencies.startPreviewServer).not.toHaveBeenCalled();
            expect(dependencies.waitForPreview).not.toHaveBeenCalled();
            expect(dependencies.stopPreviewServer).not.toHaveBeenCalled();
            expect(dependencies.chromium.launch).toHaveBeenCalledOnce();
            expect(dependencies.createExportReport).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseUrl: "http://127.0.0.1:5000/",
                }),
            );
            expect(browser.close).toHaveBeenCalledOnce();
        });

        test("then skipBuild prevents the build but still exports the targets", async () => {
            const dependencies = createDependencies();
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/",
                skipBuild: true,
            });
            const browser = createBrowserDouble([createPageDouble(), createPageDouble()]);
            dependencies.chromium.launch.mockResolvedValue(browser);

            await runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options,
                dependencies,
            });

            expect(dependencies.buildSite).not.toHaveBeenCalled();
            expect(dependencies.chromium.launch).toHaveBeenCalledOnce();
            expect(browser.close).toHaveBeenCalledOnce();
        });
    });

    describe("when a real export needs a preview server", () => {
        test("then it builds, starts preview, waits for readiness, exports, and stops preview in order", async () => {
            const dependencies = createDependencies();
            const projectRoot = "e:/teaching/DIBS/projects/astro-website";
            const previewProcess = { pid: 9876 };
            dependencies.startPreviewServer.mockReturnValue(previewProcess);
            dependencies.waitForPreview.mockResolvedValue("http://127.0.0.1:4321/");
            const browser = createBrowserDouble([createPageDouble(), createPageDouble()]);
            dependencies.chromium.launch.mockResolvedValue(browser);
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
            expect(dependencies.chromium.launch).toHaveBeenCalledOnce();
            expect(browser.close).toHaveBeenCalledOnce();
            expect(dependencies.stopPreviewServer).toHaveBeenCalledWith(previewProcess);

            expect(dependencies.buildSite.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.startPreviewServer.mock.invocationCallOrder[0],
            );
            expect(dependencies.startPreviewServer.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.waitForPreview.mock.invocationCallOrder[0],
            );
            expect(dependencies.waitForPreview.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.chromium.launch.mock.invocationCallOrder[0],
            );
            expect(dependencies.chromium.launch.mock.invocationCallOrder[0]).toBeLessThan(
                dependencies.stopPreviewServer.mock.invocationCallOrder[0],
            );
        });

        test("then keepServer leaves a started preview running", async () => {
            const dependencies = createDependencies();
            const browser = createBrowserDouble([createPageDouble(), createPageDouble()]);
            dependencies.chromium.launch.mockResolvedValue(browser);
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
            expect(dependencies.chromium.launch).not.toHaveBeenCalled();
            expect(dependencies.stopPreviewServer).not.toHaveBeenCalled();
        });

        test("then preview stops when browser launch fails", async () => {
            const dependencies = createDependencies();
            const previewProcess = { pid: 2468 };
            dependencies.startPreviewServer.mockReturnValue(previewProcess);
            dependencies.chromium.launch.mockRejectedValue(new Error("Launch failed."));

            await expect(runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options: createRealExportOptions(),
                dependencies,
            })).rejects.toThrow("Launch failed.");

            expect(dependencies.stopPreviewServer).toHaveBeenCalledWith(previewProcess);
        });
    });

    describe("when a real export reaches the final outcome decision", () => {
        test.each([
            {
                name: "clean export",
                hasFatalFindings: false,
                failedPdfCount: 0,
                expectedMessage: undefined,
            },
            {
                name: "generation failures only",
                hasFatalFindings: false,
                failedPdfCount: 2,
                expectedMessage: finalFailureMessage({ generationFailureCount: 2 }),
            },
            {
                name: "fatal findings only",
                hasFatalFindings: true,
                failedPdfCount: 0,
                expectedMessage: finalFailureMessage({ hasFatalFindings: true }),
            },
            {
                name: "fatal findings and generation failures",
                hasFatalFindings: true,
                failedPdfCount: 2,
                expectedMessage: finalFailureMessage({
                    hasFatalFindings: true,
                    generationFailureCount: 2,
                }),
            },
        ])("then $name is handled after writing the report", async ({
            hasFatalFindings,
            failedPdfCount,
            expectedMessage,
        }) => {
            const dependencies = createDependencies();
            dependencies.hasFatalExportFindings.mockReturnValue(hasFatalFindings);
            const events: EventLog = [];
            dependencies.createExportReport.mockImplementation((input: ReportInput) => {
                events.push("create-report");
                return createReport(input);
            });
            dependencies.writeExportReport.mockImplementation(async () => {
                events.push("write-report");
            });
            const pages = resolvedTargets.map((_, index) =>
                createPageDouble({
                    events,
                    label: `target-${index + 1}`,
                    pdfImplementation: index < failedPdfCount
                        ? async () => {
                            events.push(`export-failed:target-${index + 1}`);
                            throw new Error(`PDF failed for target ${index + 1}.`);
                        }
                        : undefined,
                })
            );
            const browser = createBrowserDouble(pages, { events });
            dependencies.chromium.launch.mockResolvedValue(browser);
            const projectRoot = "e:/teaching/DIBS/projects/astro-website";
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/",
                skipBuild: true,
            });
            const run = runPdfExport({ projectRoot, options, dependencies });

            if (expectedMessage) {
                await expect(run).rejects.toThrow(expectedMessage);
            } else {
                await expect(run).resolves.toBeUndefined();
                expect(dependencies.logger.log).toHaveBeenCalledWith(
                    "[export-lessons-pdf] Exported 2 lesson(s) to dist/exports/pdf.",
                );
            }

            expect(dependencies.createExportReport).toHaveBeenCalledOnce();
            expect(dependencies.writeExportReport).toHaveBeenCalledOnce();
            expect(dependencies.writeExportReport).toHaveBeenCalledWith(
                path.resolve(projectRoot, options.reportPath),
                expect.objectContaining({
                    summary: expect.objectContaining({
                        failed: failedPdfCount,
                    }),
                }),
            );
            expect(dependencies.writeExportReport.mock.invocationCallOrder[0]).toBeLessThan(
                browser.close.mock.invocationCallOrder[0],
            );

            if (expectedMessage) {
                expect(expectedMessage.startsWith(
                    "PDF export completed with problems after writing the report:",
                )).toBe(true);
                expect(expectedMessage.endsWith("Report: dist/exports/pdf/report.json")).toBe(true);
                expect(expectedMessage.includes(
                    "- export findings matched the configured --fail-on policy",
                )).toBe(hasFatalFindings);
                expect(expectedMessage.includes(
                    `- PDF generation failed for ${failedPdfCount} lesson(s)`,
                )).toBe(failedPdfCount > 0);
            }
        });
    });

    describe("when the runner exports prepared targets directly", () => {
        test("then it collects findings through locator.evaluateAll and preserves the mapped shape", async () => {
            const dependencies = createDependencies();
            const events: EventLog = [];
            const fakeFindingElements = [
                {
                    getAttribute: (attribute: string) => {
                        switch (attribute) {
                            case "data-export-finding":
                                return "client-only-island";
                            case "data-export-finding-severity":
                                return "warning";
                            default:
                                return null;
                        }
                    },
                    dataset: {
                        exportFinding: "client-only-island",
                        exportFindingSeverity: "warning",
                    },
                    textContent: " Pikachu island rendered on the client only. ",
                },
            ];
            const findingLocator = createLocatorDouble("[data-export-finding]", fakeFindingElements);
            const documentLocator = createLocatorDouble("[data-export-role=\"document\"]", []);
            const bodyLocator = createLocatorDouble("[data-export-role=\"body\"]", []);
            const firstPage = {
                goto: vi.fn(async () => ({ ok: () => true })),
                pdf: vi.fn(async () => {
                    events.push("export-ok:androth");
                }),
                close: vi.fn(async () => {
                    events.push("page-close:androth");
                }),
                locator: vi.fn((selector: string) => {
                    switch (selector) {
                        case "[data-export-role=\"document\"]":
                            return documentLocator;
                        case "[data-export-role=\"body\"]":
                            return bodyLocator;
                        case "[data-export-finding]":
                            return findingLocator;
                        default:
                            return createLocatorDouble(selector, []);
                    }
                }),
            };
            const secondPage = createPageDouble({ events, label: "tuul" });
            const browser = createBrowserDouble([firstPage, secondPage], { events });
            dependencies.chromium.launch.mockResolvedValue(browser);
            const projectRoot = "e:/teaching/DIBS/projects/astro-website";
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/",
                skipBuild: true,
            });

            await runPdfExport({ projectRoot, options, dependencies });

            expect(browser.newPage).toHaveBeenCalledWith({
                viewport: { width: 1280, height: 1600 },
            });
            expect(firstPage.goto).toHaveBeenCalledWith(
                "http://127.0.0.1:5000/exports/pdf/notes/blackthorne/androth/",
                {
                    waitUntil: "domcontentloaded",
                    timeout: options.timeoutMs,
                },
            );
            expect(firstPage.locator).toHaveBeenCalledWith("[data-export-role=\"document\"]");
            expect(firstPage.locator).toHaveBeenCalledWith("[data-export-role=\"body\"]");
            expect(firstPage.locator).toHaveBeenCalledWith("[data-export-finding]");
            expect(findingLocator.evaluateAll).toHaveBeenCalledOnce();
            expect(dependencies.mkdir).toHaveBeenCalledWith(
                path.dirname(path.resolve(projectRoot, resolvedTargets[0].outputPath)),
                { recursive: true },
            );
            expect(firstPage.pdf).toHaveBeenCalledWith({
                path: path.resolve(projectRoot, resolvedTargets[0].outputPath),
                format: "A4",
                printBackground: true,
                preferCSSPageSize: true,
                margin: {
                    top: "0",
                    right: "0",
                    bottom: "0",
                    left: "0",
                },
            });
            expect(firstPage.close).toHaveBeenCalledOnce();
            expect(secondPage.close).toHaveBeenCalledOnce();
            expect(browser.close).toHaveBeenCalledOnce();
            expect(events).toEqual([
                "export-ok:androth",
                "page-close:androth",
                "export-ok:tuul",
                "page-close:tuul",
                "browser-close",
            ]);

            expect(dependencies.createExportReport).toHaveBeenCalledWith({
                generatedAt: "2026-05-11T00:00:00.000Z",
                baseUrl: "http://127.0.0.1:5000/",
                outDir: options.outDir,
                selection: options.selection,
                entries: [
                    {
                        route: manifestEntries[0].route,
                        exportRoute: manifestEntries[0].exportRoute,
                        url: "http://127.0.0.1:5000/exports/pdf/notes/blackthorne/androth/",
                        outputPath: resolvedTargets[0].outputPath,
                        status: "exported",
                        title: manifestEntries[0].title,
                        findings: [
                            {
                                code: "client-only-island",
                                message: "Pikachu island rendered on the client only.",
                                severity: "warning",
                            },
                        ],
                    },
                    {
                        route: manifestEntries[1].route,
                        exportRoute: manifestEntries[1].exportRoute,
                        url: "http://127.0.0.1:5000/exports/pdf/notes/blackthorne/tuul/",
                        outputPath: resolvedTargets[1].outputPath,
                        status: "exported",
                        title: manifestEntries[1].title,
                        findings: [],
                    },
                ],
            });
        });

        test("then it records failed targets, continues, writes the report, and fails after report writing", async () => {
            const dependencies = createDependencies();
            const events: EventLog = [];
            dependencies.createExportReport.mockImplementation((input: ReportInput) => {
                events.push("create-report");
                return createReport(input);
            });
            dependencies.writeExportReport.mockImplementation(async () => {
                events.push("write-report");
            });
            const firstPage = createPageDouble({
                events,
                gotoImplementation: async () => {
                    events.push("export-failed:androth");
                    throw new Error("Navigation failed.");
                },
                label: "androth",
            });
            const secondPage = createPageDouble({ events, label: "tuul" });
            const browser = createBrowserDouble([firstPage, secondPage], { events });
            dependencies.chromium.launch.mockResolvedValue(browser);
            const projectRoot = "e:/teaching/DIBS/projects/astro-website";
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/",
                skipBuild: true,
            });

            await expect(runPdfExport({ projectRoot, options, dependencies })).rejects.toThrow(
                finalFailureMessage({ generationFailureCount: 1 }),
            );

            expect(firstPage.close).toHaveBeenCalledOnce();
            expect(secondPage.close).toHaveBeenCalledOnce();
            expect(browser.close).toHaveBeenCalledOnce();
            expect(dependencies.writeExportReport).toHaveBeenCalledOnce();

            const reportInput = dependencies.createExportReport.mock.calls[0][0];
            expect(reportInput.entries).toEqual([
                {
                    route: manifestEntries[0].route,
                    exportRoute: manifestEntries[0].exportRoute,
                    url: "http://127.0.0.1:5000/exports/pdf/notes/blackthorne/androth/",
                    outputPath: resolvedTargets[0].outputPath,
                    status: "failed",
                    title: manifestEntries[0].title,
                    findings: [],
                    error: {
                        kind: "pdf-generation-failed",
                        message: "Navigation failed.",
                    },
                },
                {
                    route: manifestEntries[1].route,
                    exportRoute: manifestEntries[1].exportRoute,
                    url: "http://127.0.0.1:5000/exports/pdf/notes/blackthorne/tuul/",
                    outputPath: resolvedTargets[1].outputPath,
                    status: "exported",
                    title: manifestEntries[1].title,
                    findings: [],
                },
            ]);
            expect(dependencies.writeExportReport.mock.invocationCallOrder[0]).toBeLessThan(
                browser.close.mock.invocationCallOrder[0],
            );
            expect(events).toEqual([
                "export-failed:androth",
                "page-close:androth",
                "export-ok:tuul",
                "page-close:tuul",
                "create-report",
                "write-report",
                "browser-close",
            ]);
        });

        test("then browser allocation failures close the browser without exporting later targets", async () => {
            const dependencies = createDependencies();
            const browser = createBrowserDouble([]);
            dependencies.chromium.launch.mockResolvedValue(browser);
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/",
                skipBuild: true,
            });

            await expect(runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options,
                dependencies,
            })).rejects.toThrow("No more pages available.");

            expect(browser.newPage).toHaveBeenCalledOnce();
            expect(dependencies.createExportReport).not.toHaveBeenCalled();
            expect(dependencies.writeExportReport).not.toHaveBeenCalled();
            expect(browser.close).toHaveBeenCalledOnce();
        });

        test("then report creation failures close the browser without writing the report", async () => {
            const dependencies = createDependencies();
            const events: EventLog = [];
            const firstPage = createPageDouble({ events, label: "androth" });
            const secondPage = createPageDouble({ events, label: "tuul" });
            const browser = createBrowserDouble([firstPage, secondPage], { events });
            dependencies.chromium.launch.mockResolvedValue(browser);
            dependencies.createExportReport.mockImplementation(() => {
                events.push("create-report");
                throw new Error("Report creation failed.");
            });
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/",
                skipBuild: true,
            });

            await expect(runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options,
                dependencies,
            })).rejects.toThrow("Report creation failed.");

            expect(firstPage.close).toHaveBeenCalledOnce();
            expect(secondPage.close).toHaveBeenCalledOnce();
            expect(dependencies.writeExportReport).not.toHaveBeenCalled();
            expect(browser.close).toHaveBeenCalledOnce();
            expect(events).toEqual([
                "export-ok:androth",
                "page-close:androth",
                "export-ok:tuul",
                "page-close:tuul",
                "create-report",
                "browser-close",
            ]);
        });

        test("then report writing failures close the browser after the write attempt", async () => {
            const dependencies = createDependencies();
            const events: EventLog = [];
            dependencies.writeExportReport.mockImplementation(async () => {
                events.push("write-report");
                throw new Error("Report write failed.");
            });
            const firstPage = createPageDouble({ events, label: "androth" });
            const secondPage = createPageDouble({ events, label: "tuul" });
            const browser = createBrowserDouble([firstPage, secondPage], { events });
            dependencies.chromium.launch.mockResolvedValue(browser);
            const options = createRealExportOptions({
                baseUrl: "http://127.0.0.1:5000/",
                skipBuild: true,
            });

            await expect(runPdfExport({
                projectRoot: "e:/teaching/DIBS/projects/astro-website",
                options,
                dependencies,
            })).rejects.toThrow("Report write failed.");

            expect(dependencies.createExportReport).toHaveBeenCalledOnce();
            expect(dependencies.writeExportReport).toHaveBeenCalledOnce();
            expect(browser.close).toHaveBeenCalledOnce();
            expect(dependencies.writeExportReport.mock.invocationCallOrder[0]).toBeLessThan(
                browser.close.mock.invocationCallOrder[0],
            );
            expect(events).toEqual([
                "export-ok:androth",
                "page-close:androth",
                "export-ok:tuul",
                "page-close:tuul",
                "write-report",
                "browser-close",
            ]);
        });
    });
});
