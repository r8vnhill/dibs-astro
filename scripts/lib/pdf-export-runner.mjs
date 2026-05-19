import path from "node:path";

import { buildSite } from "./build-site.mjs";
import { resolveExportTargets, selectExportEntries } from "./pdf-export-cli.mjs";
import { buildLessonPdfExportManifest } from "./pdf-export-manifest.mjs";
import { createExportReport, writeExportReport } from "./pdf-export-report.mjs";
import { startPreviewServer, stopPreviewServer, waitForPreview } from "./preview-server.mjs";

const defaultDependencies = {
    buildSite,
    buildLessonPdfExportManifest,
    selectExportEntries,
    resolveExportTargets,
    createExportReport,
    writeExportReport,
    startPreviewServer,
    waitForPreview,
    stopPreviewServer,
    exportPreparedTargets: async () => {
        throw new Error("pdf-export-runner requires exportPreparedTargets for real export execution.");
    },
    now: () => new Date(),
    logger: console,
};

export async function runPdfExport({ projectRoot, options, dependencies = {} }) {
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
    const validationErrors = validation.findings.filter((finding) => finding.severity === "error");

    if (validationErrors.length > 0) {
        throw new Error(formatValidationErrors(validationErrors));
    }

    const selectedEntries = dependencies.selectExportEntries(manifest, options.selection);
    const targets = dependencies.resolveExportTargets(selectedEntries, options.outDir);

    return { manifest, selectedEntries, targets };
}

async function writeDryRunReport({ projectRoot, options, targets, dependencies }) {
    const report = dependencies.createExportReport({
        generatedAt: dependencies.now().toISOString(),
        baseUrl: options.baseUrl ?? "dry-run",
        outDir: options.outDir,
        selection: options.selection,
        entries: targets.map(({ entry, outputPath }) => ({
            route: entry.route,
            exportRoute: entry.exportRoute,
            url: options.baseUrl
                ? new URL(entry.exportRoute, options.baseUrl).href
                : entry.exportRoute,
            outputPath,
            status: "skipped",
            title: entry.title,
            findings: [],
        })),
    });

    await dependencies.writeExportReport(
        path.resolve(projectRoot, options.reportPath),
        report,
    );

    dependencies.logger.log(
        `[export-lessons-pdf] Dry run selected ${report.summary.selected} lesson(s).`,
    );
}

async function exportPreparedRun({ projectRoot, options, targets, dependencies }) {
    if (!options.skipBuild) {
        await dependencies.buildSite({ projectRoot });
    }

    let baseUrl = options.baseUrl
        ? normalizeBaseUrl(options.baseUrl)
        : undefined;
    let previewProcess;

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

        await dependencies.exportPreparedTargets({ targets, baseUrl });
    } finally {
        if (previewProcess && !options.keepServer) {
            await dependencies.stopPreviewServer(previewProcess);
        }
    }
}

function formatValidationErrors(findings) {
    return [
        "PDF lesson export manifest is invalid:",
        ...findings.map((finding) => `- ${finding.message}`),
    ].join("\n");
}

function normalizeBaseUrl(baseUrl) {
    return new URL("/", baseUrl).href;
}
