import { mkdir as defaultMkdir } from "node:fs/promises";
import path from "node:path";

import { JSDOM as DefaultJSDOM } from "jsdom";
import { chromium as defaultChromium } from "playwright";

import { buildSite } from "./build-site.mjs";
import { resolveExportTargets, selectExportEntries } from "./cli.mjs";
import { buildLessonPdfExportManifest } from "./manifest.mjs";
import { startPreviewServer, stopPreviewServer, waitForPreview } from "./preview-server.mjs";
import {
    collectExportFindings,
    createExportReport,
    decidePdfExportExitCode,
    hasFatalExportFindings,
    writeExportReport,
} from "./report.mjs";

const exportDomSelectors = {
    document: "[data-export-role=\"document\"]",
    body: "[data-export-role=\"body\"]",
};

const defaultDependencies = {
    buildSite,
    buildLessonPdfExportManifest,
    chromium: defaultChromium,
    collectExportFindings,
    createExportReport,
    decidePdfExportExitCode,
    hasFatalExportFindings,
    JSDOM: DefaultJSDOM,
    logger: console,
    mkdir: defaultMkdir,
    now: () => new Date(),
    resolveExportTargets,
    selectExportEntries,
    startPreviewServer,
    stopPreviewServer,
    waitForPreview,
    writeExportReport,
};

export async function runPdfExport({
    projectRoot,
    options,
    dependencies = {},
}) {
    dependencies = { ...defaultDependencies, ...dependencies };
    const { targets } = preparePdfExportRun({ options, dependencies });

    if (options.dryRun) {
        await writeDryRunReport({
            projectRoot,
            options,
            targets,
            dependencies,
        });
        return;
    }

    await exportPreparedRun({
        projectRoot,
        options,
        targets,
        dependencies,
    });
}

export function preparePdfExportRun({ options, dependencies = {} }) {
    dependencies = { ...defaultDependencies, ...dependencies };
    const { manifest, validation } = dependencies.buildLessonPdfExportManifest({
        outDir: options.outDir,
    });
    const validationErrors = validation.findings.filter(
        (finding) => finding.severity === "error",
    );

    if (validationErrors.length > 0) {
        throw new Error(formatValidationErrors(validationErrors));
    }

    const selectedEntries = dependencies.selectExportEntries(
        manifest,
        options.selection,
    );
    const targets = dependencies.resolveExportTargets(
        selectedEntries,
        options.outDir,
    );

    return { manifest, selectedEntries, targets };
}

async function writeDryRunReport({
    projectRoot,
    options,
    targets,
    dependencies,
}) {
    const report = dependencies.createExportReport({
        generatedAt: dependencies.now().toISOString(),
        baseUrl: options.baseUrl ?? "dry-run",
        outDir: options.outDir,
        selection: options.selection,
        exitPolicy: toReportExitPolicy(options),
        entries: targets.map(({ entry, outputPath }) => ({
            route: entry.route,
            exportRoute: entry.exportRoute,
            url: options.baseUrl
                ? new URL(entry.exportRoute, options.baseUrl).href
                : entry.exportRoute,
            outputPath,
            status: "skipped",
            title: entry.title,
            findings: mergeExportFindings(entry),
        })),
    });

    await dependencies.writeExportReport(
        path.resolve(projectRoot, options.reportPath),
        report,
    );

    const exitCode = dependencies.decidePdfExportExitCode(report, {
        continueOnError: options.continueOnError ?? false,
        findingPolicy: getFindingPolicy(options),
    });

    if (exitCode !== 0) {
        throw new Error(
            formatFinalExportFailure({
                hasFatalFindings: dependencies.hasFatalExportFindings(
                    report,
                    getFindingPolicy(options),
                ),
                generationFailureCount: report.summary.failed,
                reportPath: options.reportPath,
            }),
        );
    }

    dependencies.logger.log(
        `[export-lessons-pdf] Dry run selected ${report.summary.selected} lesson(s).`,
    );
}

async function exportPreparedRun({
    projectRoot,
    options,
    targets,
    dependencies,
}) {
    if (!options.skipBuild) {
        await dependencies.buildSite({ projectRoot });
    }

    let baseUrl = options.baseUrl
        ? normalizeBaseUrl(options.baseUrl)
        : undefined;
    let previewProcess;
    let browser;

    try {
        if (!baseUrl) {
            previewProcess = dependencies.startPreviewServer({
                projectRoot,
                port: options.port,
            });
            baseUrl = await dependencies.waitForPreview(
                `http://127.0.0.1:${options.port}/`,
                options.timeoutMs,
            );
        }

        browser = await dependencies.chromium.launch();

        try {
            const reportEntries = await exportSelectedLessons({
                browser,
                targets,
                baseUrl,
                projectRoot,
                options,
                dependencies,
            });

            const report = dependencies.createExportReport({
                generatedAt: dependencies.now().toISOString(),
                baseUrl,
                outDir: options.outDir,
                selection: options.selection,
                exitPolicy: toReportExitPolicy(options),
                entries: reportEntries,
            });

            await dependencies.writeExportReport(
                path.resolve(projectRoot, options.reportPath),
                report,
            );

            const exitCode = dependencies.decidePdfExportExitCode(report, {
                continueOnError: options.continueOnError ?? false,
                findingPolicy: getFindingPolicy(options),
            });

            if (exitCode !== 0) {
                throw new Error(
                    formatFinalExportFailure({
                        hasFatalFindings: dependencies.hasFatalExportFindings(
                            report,
                            getFindingPolicy(options),
                        ),
                        generationFailureCount: report.summary.failed,
                        reportPath: options.reportPath,
                    }),
                );
            }

            dependencies.logger.log(
                `[export-lessons-pdf] Exported ${report.summary.exported} lesson(s) to ${options.outDir}.`,
            );
        } finally {
            await browser.close();
        }
    } finally {
        if (previewProcess && !options.keepServer) {
            await dependencies.stopPreviewServer(previewProcess);
        }
    }
}

async function exportSelectedLessons({
    browser,
    targets,
    baseUrl,
    projectRoot,
    options,
    dependencies,
}) {
    const reportEntries = [];

    for (const target of targets) {
        const result = await exportOneLesson({
            browser,
            target,
            baseUrl,
            projectRoot,
            timeoutMs: options.timeoutMs,
            mkdir: dependencies.mkdir,
            collectExportFindings: dependencies.collectExportFindings,
            JSDOM: dependencies.JSDOM,
        });

        if (result.status === "exported") {
            reportEntries.push(toExportedReportEntry(result));
            continue;
        }

        reportEntries.push(toFailedExportEntry(result));
    }

    return reportEntries;
}

async function exportOneLesson({
    browser,
    target,
    baseUrl,
    projectRoot,
    timeoutMs,
    mkdir,
    collectExportFindings,
    JSDOM,
}) {
    const { entry, outputPath } = target;
    const url = new URL(entry.exportRoute, baseUrl).href;
    const filePath = path.resolve(projectRoot, outputPath);
    let page;

    try {
        page = await browser.newPage({
            viewport: { width: 1280, height: 1600 },
        });

        const response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: timeoutMs,
        });

        if (!response || !response.ok()) {
            throw new Error(`Preview returned an invalid response for ${url}.`);
        }

        await waitForExportDomContract(page, timeoutMs);

        const findings = collectExportFindings(
            new JSDOM(await page.content()).window.document,
            { route: entry.route },
        );

        await mkdir(path.dirname(filePath), { recursive: true });
        await page.pdf({
            path: filePath,
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

        return {
            status: "exported",
            entry,
            url,
            outputPath,
            findings: mergeExportFindings(entry, findings),
        };
    } catch (error) {
        return {
            status: "failed",
            entry,
            url,
            outputPath,
            error: {
                kind: "pdf-generation-failed",
                message: error instanceof Error ? error.message : String(error),
            },
        };
    } finally {
        if (page) {
            await page.close();
        }
    }
}

async function waitForExportDomContract(page, timeoutMs) {
    await page.locator(exportDomSelectors.document).waitFor({
        state: "attached",
        timeout: timeoutMs,
    });

    await page.locator(exportDomSelectors.body).waitFor({
        state: "attached",
        timeout: timeoutMs,
    });
}

function toExportedReportEntry(result) {
    return {
        route: result.entry.route,
        exportRoute: result.entry.exportRoute,
        url: result.url,
        outputPath: result.outputPath,
        status: "exported",
        title: result.entry.title,
        findings: result.findings,
    };
}

function toFailedExportEntry(result) {
    return {
        route: result.entry.route,
        exportRoute: result.entry.exportRoute,
        url: result.url,
        outputPath: result.outputPath,
        status: "failed",
        title: result.entry.title,
        findings: mergeExportFindings(result.entry),
        error: result.error,
    };
}

function mergeExportFindings(entry, domFindings = []) {
    return [
        ...(entry.findings ?? []).map((finding) => withFindingSource(finding, "manifest")),
        ...domFindings.map((finding) => withFindingSource(finding, "dom")),
    ];
}

function withFindingSource(finding, source) {
    return {
        ...finding,
        source,
    };
}

function formatValidationErrors(findings) {
    return [
        "PDF lesson export manifest is invalid:",
        ...findings.map((finding) => `- ${finding.message}`),
    ].join("\n");
}

function formatFinalExportFailure({
    hasFatalFindings,
    generationFailureCount,
    reportPath,
}) {
    const bullets = [];

    if (hasFatalFindings) {
        bullets.push(
            "- export findings matched the configured --fail-on policy",
        );
    }

    if (generationFailureCount > 0) {
        bullets.push(
            `- PDF generation failed for ${generationFailureCount} lesson(s)`,
        );
    }

    return [
        "PDF export completed with problems after writing the report:",
        ...bullets,
        `Report: ${reportPath}`,
    ].join("\n");
}

function toReportExitPolicy(options) {
    return {
        continueOnError: options.continueOnError ?? false,
        failOn: getFindingPolicy(options).failOn,
    };
}

function getFindingPolicy(options) {
    return options.findingPolicy ?? { failOn: [] };
}

function normalizeBaseUrl(baseUrl) {
    return new URL("/", baseUrl).href;
}
