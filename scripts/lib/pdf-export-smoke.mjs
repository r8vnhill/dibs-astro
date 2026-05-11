import path from "node:path";

import { normalizeLessonRoute } from "@ravenhill/lesson-export-core";

export const DEFAULT_PDF_SMOKE_ROUTE = "/notes/software-libraries/artifacts-taxonomy/";

export function readPdfSmokeConfig(env = process.env) {
    if (env.EXPORT_PDF_SMOKE !== "1") {
        throw new Error("Set EXPORT_PDF_SMOKE=1 to run the PDF smoke test.");
    }

    return {
        route: env.EXPORT_PDF_SMOKE_ROUTE?.trim() || DEFAULT_PDF_SMOKE_ROUTE,
        keepOutput: env.EXPORT_PDF_SMOKE_KEEP_OUTPUT === "1",
    };
}

export function resolvePdfSmokeEntry(manifest, preferredRoute = DEFAULT_PDF_SMOKE_ROUTE) {
    const route = normalizeLessonRoute(preferredRoute);
    const entry = manifest.entries.find((candidate) => candidate.route === route);

    if (!entry) {
        throw new Error(`No PDF smoke export entry found for ${route}.`);
    }

    return entry;
}

export function createPdfSmokeWorkspace(projectRoot, runId = createPdfSmokeRunId()) {
    const relativeRoot = path.posix.join("tmp", "pdf-export-smoke", runId);

    return {
        relativeRoot,
        relativeOutDir: path.posix.join(relativeRoot, "pdf"),
        relativeReportPath: path.posix.join(relativeRoot, "report.json"),
        absoluteRoot: path.resolve(projectRoot, relativeRoot),
        absoluteOutDir: path.resolve(projectRoot, relativeRoot, "pdf"),
        absoluteReportPath: path.resolve(projectRoot, relativeRoot, "report.json"),
    };
}

export function createPdfSmokeRunId(now = new Date()) {
    const timestamp = now.toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const suffix = Math.random().toString(16).slice(2, 8);

    return `${timestamp}-${suffix}`;
}

export function assertPdfSmokeReport(report, expectedEntry) {
    if (!report || typeof report !== "object") {
        throw new Error("PDF smoke report must be a JSON object.");
    }

    if (report.selection?.kind !== "route" || report.selection?.value !== expectedEntry.route) {
        throw new Error(`PDF smoke report selection did not match ${expectedEntry.route}.`);
    }

    if (!report.summary || report.summary.selected !== 1 || report.summary.exported !== 1 || report.summary.failed !== 0) {
        throw new Error("PDF smoke report summary did not record one exported entry.");
    }

    if (!Array.isArray(report.entries) || report.entries.length !== 1) {
        throw new Error("PDF smoke report must contain exactly one entry.");
    }

    const [entry] = report.entries;

    if (entry.route !== expectedEntry.route) {
        throw new Error(`PDF smoke report route did not match ${expectedEntry.route}.`);
    }

    if (entry.outputPath !== expectedEntry.outputPath) {
        throw new Error(`PDF smoke report output path did not match ${expectedEntry.outputPath}.`);
    }

    if (entry.status !== "exported") {
        throw new Error("PDF smoke report entry was not exported.");
    }

    return entry;
}

export async function assertPreviewServerStopped(port, timeoutMs = 2000) {
    const url = `http://127.0.0.1:${port}/`;
    const deadline = Date.now() + timeoutMs;
    let lastSuccessfulResponse;

    while (Date.now() < deadline) {
        try {
            lastSuccessfulResponse = await fetch(url, {
                signal: AbortSignal.timeout(Math.min(500, Math.max(1, deadline - Date.now()))),
            });
        } catch {
            return;
        }

        await delay(100);
    }

    if (lastSuccessfulResponse) {
        throw new Error(`Preview server is still responding on ${url} with HTTP ${lastSuccessfulResponse.status}.`);
    }

    throw new Error(`Preview server at ${url} did not stop within ${timeoutMs}ms.`);
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}