import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeExportFindingKind } from "@ravenhill/lesson-export-core";

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

export function hasFatalExportFindings(report, findingPolicy) {
    const failOn = findingPolicy.failOn;

    if (failOn === "any") {
        return report.summary.findings > 0;
    }

    if (failOn.length === 0) {
        return false;
    }

    const fatalKinds = new Set(failOn);
    return report.entries.some((entry) =>
        (entry.findings ?? []).some((finding) => {
            const kind = normalizeReportFindingKind(finding);

            return kind !== undefined && fatalKinds.has(kind);
        }),
    );
}

function normalizeReportFindingKind(finding) {
    return normalizeExportFindingKind(finding.kind ?? finding.code);
}
