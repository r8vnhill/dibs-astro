import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function createExportReport({ generatedAt, baseUrl, outDir, selection, entries }) {
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
    return {
        selected: entries.length,
        exported: entries.filter((entry) => entry.status === "exported").length,
        failed: entries.filter((entry) => entry.status === "failed").length,
        findings: entries.reduce((total, entry) => total + entry.findings.length, 0),
    };
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