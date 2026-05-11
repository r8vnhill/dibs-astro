#!/usr/bin/env node

import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { buildSite } from "./lib/build-site.mjs";
import { buildLessonPdfExportManifest } from "./lib/pdf-export-manifest.mjs";
import { parseCliArgs, resolveExportTargets, selectExportEntries } from "./lib/pdf-export-cli.mjs";
import { collectExportFindings, createExportReport, writeExportReport } from "./lib/pdf-export-report.mjs";
import { startPreviewServer, stopPreviewServer, waitForPreview } from "./lib/preview-server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const main = async () => {
    const options = parseCliArgs(process.argv.slice(2));
    const { manifest, validation } = buildLessonPdfExportManifest({ outDir: options.outDir });
    const validationErrors = validation.findings.filter((finding) => finding.severity === "error");

    if (validationErrors.length > 0) {
        throw new Error(formatValidationErrors(validationErrors));
    }

    const selectedEntries = selectExportEntries(manifest, options.selection);
    const targets = resolveExportTargets(selectedEntries, options.outDir);

    if (options.dryRun) {
        const report = createExportReport({
            generatedAt: new Date().toISOString(),
            baseUrl: options.baseUrl ?? "dry-run",
            outDir: options.outDir,
            selection: options.selection,
            entries: targets.map(({ entry, outputPath }) => ({
                route: entry.route,
                exportRoute: entry.exportRoute,
                url: options.baseUrl ? new URL(entry.exportRoute, options.baseUrl).href : entry.exportRoute,
                outputPath,
                status: "skipped",
                title: entry.title,
                findings: [],
            })),
        });

        await writeExportReport(path.resolve(projectRoot, options.reportPath), report);
        console.log(`[export-lessons-pdf] Dry run selected ${report.summary.selected} lesson(s).`);
        return;
    }

    if (!options.skipBuild) {
        await buildSite({ projectRoot });
    }

    let baseUrl = options.baseUrl ? normalizeBaseUrl(options.baseUrl) : undefined;
    let previewProcess;
    const reportEntries = [];
    let failureCount = 0;

    try {
        if (!baseUrl) {
            previewProcess = startPreviewServer({ projectRoot, port: options.port });
            baseUrl = await waitForPreview(`http://127.0.0.1:${options.port}/`, options.timeoutMs);
        }

        const browser = await chromium.launch();

        for (const { entry, outputPath } of targets) {
            const url = new URL(entry.exportRoute, baseUrl).href;
            const filePath = path.resolve(projectRoot, outputPath);

            try {
                const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
                const response = await page.goto(url, {
                    waitUntil: "domcontentloaded",
                    timeout: options.timeoutMs,
                });

                if (!response || !response.ok()) {
                    throw new Error(`Preview returned an invalid response for ${url}.`);
                }

                await page.locator('[data-export-role="document"]').waitFor({
                    state: "attached",
                    timeout: options.timeoutMs,
                });
                await page.locator('[data-export-role="body"]').waitFor({
                    state: "attached",
                    timeout: options.timeoutMs,
                });

                const pageFindings = await page.$$eval("[data-export-finding]", (elements) => elements.map((element) => ({
                    code: element.getAttribute("data-export-finding") ?? element.dataset.exportFinding ?? "unknown",
                    message: element.textContent?.trim() || undefined,
                    severity: element.getAttribute("data-export-finding-severity") ?? element.dataset.exportFindingSeverity ?? undefined,
                })));

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

                reportEntries.push({
                    route: entry.route,
                    exportRoute: entry.exportRoute,
                    url,
                    outputPath,
                    status: "exported",
                    title: entry.title,
                    findings: collectExportFindings(pageFindings),
                });

                await page.close();
            } catch (error) {
                failureCount += 1;
                reportEntries.push({
                    route: entry.route,
                    exportRoute: entry.exportRoute,
                    url,
                    outputPath,
                    status: "failed",
                    title: entry.title,
                    findings: [],
                    error: {
                        kind: "pdf-generation-failed",
                        message: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        }

        await browser.close();
    } finally {
        if (previewProcess && !options.keepServer) {
            stopPreviewServer(previewProcess);
        }
    }

    const report = createExportReport({
        generatedAt: new Date().toISOString(),
        baseUrl,
        outDir: options.outDir,
        selection: options.selection,
        entries: reportEntries,
    });

    await writeExportReport(path.resolve(projectRoot, options.reportPath), report);

    if (failureCount > 0) {
        throw new Error(`PDF export failed for ${failureCount} lesson(s).`);
    }

    if (options.failOnFinding && report.summary.findings > 0) {
        throw new Error("PDF export findings were reported and --fail-on-finding is enabled.");
    }

    console.log(`[export-lessons-pdf] Exported ${report.summary.exported} lesson(s) to ${options.outDir}.`);
};

main().catch((error) => {
    console.error("[export-lessons-pdf] Unexpected error:", error);
    process.exitCode = 1;
});

function normalizeBaseUrl(baseUrl) {
    return new URL("/", baseUrl).href;
}

function formatValidationErrors(findings) {
    return [
        "PDF lesson export manifest is invalid:",
        ...findings.map((finding) => `- ${finding.message}`),
    ].join("\n");
}