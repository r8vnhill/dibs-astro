import path from "node:path";

import { buildLessonPdfExportManifest } from "./pdf-export-manifest.mjs";
import { createExportReport, writeExportReport } from "./pdf-export-report.mjs";
import { resolveExportTargets, selectExportEntries } from "./pdf-export-cli.mjs";

const defaultDependencies = {
    buildLessonPdfExportManifest,
    selectExportEntries,
    resolveExportTargets,
    createExportReport,
    writeExportReport,
    now: () => new Date(),
    logger: console,
};

export async function runPdfExport({ projectRoot, options, dependencies = defaultDependencies }) {
    const { manifest, validation } = dependencies.buildLessonPdfExportManifest({
        outDir: options.outDir,
    });
    const validationErrors = validation.findings.filter((finding) => finding.severity === "error");

    if (validationErrors.length > 0) {
        throw new Error(formatValidationErrors(validationErrors));
    }

    const selectedEntries = dependencies.selectExportEntries(manifest, options.selection);
    const targets = dependencies.resolveExportTargets(selectedEntries, options.outDir);

    if (!options.dryRun) {
        throw new Error("pdf-export-runner currently only handles dry-run execution.");
    }

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

function formatValidationErrors(findings) {
    return [
        "PDF lesson export manifest is invalid:",
        ...findings.map((finding) => `- ${finding.message}`),
    ].join("\n");
}