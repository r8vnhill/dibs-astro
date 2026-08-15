import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
    buildExportSummary as buildExportSummaryCore,
    hasFatalExportFindings as hasFatalExportFindingsCore,
    normalizeExportFindingKind,
} from "@ravenhill/lesson-export-core";

export function createExportReport({
    generatedAt,
    baseUrl,
    outDir,
    selection,
    entries,
    exitPolicy,
}) {
    return {
        generatedAt,
        baseUrl,
        outDir,
        selection,
        summary: summarizeExportEntries(entries, exitPolicy),
        entries,
    };
}

export function summarizeExportEntries(entries, exitPolicy) {
    return toScriptSummary(buildExportSummaryCore(entries), exitPolicy);
}

export async function writeExportReport(reportPath, report) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function collectExportFindings(document, { route } = {}) {
    return Array.from(document.querySelectorAll("[data-export-finding]"))
        .map((element) => toDomFinding(element, { route }))
        .filter((finding) => finding !== undefined);
}

export function hasFatalExportFindings(report, findingPolicy) {
    return hasFatalExportFindingsCore(report.entries, findingPolicy.failOn);
}

export function decidePdfExportExitCode(report, policy) {
    if (hasFatalExportFindings(report, policy.findingPolicy)) {
        return 1;
    }

    if (report.summary.failed === 0) {
        return 0;
    }

    if (report.summary.exported === 0) {
        return 1;
    }

    return policy.continueOnError ? 0 : 1;
}

function toScriptSummary(summary, exitPolicy) {
    return {
        selected: summary.selected,
        exported: summary.exported,
        failed: summary.failed,
        skipped: summary.skipped,
        findings: summary.findings,
        findingsByKind: summary.findingsByKind,
        failuresByKind: summary.failuresByKind,
        ...(exitPolicy === undefined ? {} : { exitPolicy }),
    };
}

function toDomFinding(element, { route }) {
    const kind = normalizeExportFindingKind(
        element.getAttribute("data-export-finding"),
    );

    if (!kind || !isCollectableDomFindingKind(kind)) {
        return undefined;
    }

    return {
        kind,
        severity: normalizeSeverity(
            element.getAttribute("data-export-finding-severity"),
        ),
        message: formatDomFindingMessage(kind, element),
        route,
        source: "dom",
        selector: describeElement(element),
        excerpt: excerptText(element.textContent),
    };
}

function isCollectableDomFindingKind(kind) {
    return ["client-only-island", "hidden-content", "unresolved-todo"].includes(
        kind,
    );
}

function normalizeSeverity(value) {
    return ["info", "warning", "error"].includes(value) ? value : "warning";
}

function formatDomFindingMessage(kind, element) {
    const label = element.getAttribute("aria-label") ?? excerptText(element.textContent);

    return label ? `${kind}: ${label}` : kind;
}

function describeElement(element) {
    const exportRole = element
        .closest("[data-export-role]")
        ?.getAttribute("data-export-role");

    if (exportRole) {
        return `[data-export-role="${exportRole}"] [data-export-finding="${
            element.getAttribute(
                "data-export-finding",
            )
        }"]`;
    }

    const testId = element.getAttribute("data-testid");
    if (testId) {
        return `[data-testid="${testId}"]`;
    }

    return element.tagName.toLowerCase();
}

function excerptText(value) {
    const normalized = value?.replace(/\s+/g, " ").trim();

    if (!normalized) {
        return undefined;
    }

    return normalized.length > 120
        ? `${normalized.slice(0, 117)}...`
        : normalized;
}
