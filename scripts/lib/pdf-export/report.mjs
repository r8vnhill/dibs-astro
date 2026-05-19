import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
    buildExportSummary as buildExportSummaryCore,
    hasFatalExportFindings as hasFatalExportFindingsCore,
} from "@ravenhill/lesson-export-core";

export function createExportReport({
    generatedAt,
    baseUrl,
    outDir,
    selection,
    entries,
}) {
    return {
        generatedAt,
        baseUrl,
        outDir,
        selection,
        summary: summarizeExportEntries(entries),
        entries,
    };
}

export function summarizeExportEntries(entries) {
    return toScriptSummary(buildExportSummaryCore(entries));
}

export async function writeExportReport(reportPath, report) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function collectExportFindings(pageFindings) {
    return pageFindings.map((finding) => ({
        code: finding.code,
        message: finding.message,
        severity: finding.severity,
    }));
}

export function hasFatalExportFindings(report, findingPolicy) {
    return hasFatalExportFindingsCore(report.entries, findingPolicy.failOn);
}

function toScriptSummary(summary) {
    return {
        selected: summary.selected,
        exported: summary.exported,
        failed: summary.failed,
        findings: summary.findings,
    };
}
