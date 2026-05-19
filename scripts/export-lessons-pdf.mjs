#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { parseCliArgs } from "./lib/pdf-export-cli.mjs";
import {
    collectExportFindings,
    createExportReport,
    hasFatalExportFindings,
    writeExportReport,
} from "./lib/pdf-export-report.mjs";
import { runPdfExport } from "./lib/pdf-export-runner.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const main = async () => {
    const options = parseCliArgs(process.argv.slice(2));

    if (options.diagnostics.usedDeprecatedFailOnFinding) {
        process.emitWarning(
            "--fail-on-finding is deprecated. Use --fail-on <findingKind> instead.",
            {
                type: "DeprecationWarning",
                code: "DIBS_PDF_EXPORT_FAIL_ON_FINDING_DEPRECATED",
            },
        );
    }

    await runPdfExport({
        projectRoot,
        options,
        dependencies: {
            exportPreparedTargets: async ({ targets, baseUrl }) => {
                await exportPreparedTargets({ targets, baseUrl, options });
            },
        },
    });
};

main().catch((error) => {
    console.error("[export-lessons-pdf] Unexpected error:", error);
    process.exitCode = 1;
});

async function exportPreparedTargets({ targets, baseUrl, options }) {
    const reportEntries = [];
    let failureCount = 0;
    const browser = await chromium.launch();

    for (const { entry, outputPath } of targets) {
        const url = new URL(entry.exportRoute, baseUrl).href;
        const filePath = path.resolve(projectRoot, outputPath);

        try {
            const page = await browser.newPage({
                viewport: { width: 1280, height: 1600 },
            });
            const response = await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: options.timeoutMs,
            });

            if (!response || !response.ok()) {
                throw new Error(
                    `Preview returned an invalid response for ${url}.`,
                );
            }

            await page.locator("[data-export-role=\"document\"]").waitFor({
                state: "attached",
                timeout: options.timeoutMs,
            });
            await page.locator("[data-export-role=\"body\"]").waitFor({
                state: "attached",
                timeout: options.timeoutMs,
            });

            const pageFindings = await page.$$eval(
                "[data-export-finding]",
                (elements) =>
                    elements.map((element) => ({
                        code: element.getAttribute("data-export-finding")
                            ?? element.dataset.exportFinding
                            ?? "unknown",
                        message: element.textContent?.trim() || undefined,
                        severity: element.getAttribute(
                            "data-export-finding-severity",
                        )
                            ?? element.dataset.exportFindingSeverity
                            ?? undefined,
                    })),
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
                    message: error instanceof Error
                        ? error.message
                        : String(error),
                },
            });
        }
    }

    await browser.close();

    const report = createExportReport({
        generatedAt: new Date().toISOString(),
        baseUrl,
        outDir: options.outDir,
        selection: options.selection,
        entries: reportEntries,
    });

    await writeExportReport(
        path.resolve(projectRoot, options.reportPath),
        report,
    );

    if (hasFatalExportFindings(report, options.findingPolicy)) {
        throw new Error(
            "PDF export findings matched the configured --fail-on policy.",
        );
    }

    if (failureCount > 0) {
        throw new Error(`PDF export failed for ${failureCount} lesson(s).`);
    }

    console.log(
        `[export-lessons-pdf] Exported ${report.summary.exported} lesson(s) to ${options.outDir}.`,
    );
}
