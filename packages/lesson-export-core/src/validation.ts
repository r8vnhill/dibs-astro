import type { LessonExportFinding } from "./findings";
import type { LessonExportEntry, LessonExportManifest } from "./manifest";
import { isSafePdfOutputPath } from "./output-paths";
import { normalizeLessonRoute } from "./routes";

export interface LessonExportValidationResult {
    readonly valid: boolean;
    readonly findings: readonly LessonExportFinding[];
}

export function validateManifest(manifest: LessonExportManifest): LessonExportValidationResult {
    const findings = [
        ...validateGeneratedAt(manifest.generatedAt),
        ...validateEntries(manifest.entries),
        ...detectDuplicateRoutes(manifest.entries),
        ...detectDuplicateExportRoutes(manifest.entries),
        ...detectDuplicateOutputPaths(manifest.entries),
        ...detectUnsafeOutputPaths(manifest.entries),
    ];

    return {
        valid: findings.every((finding) => finding.severity !== "error"),
        findings,
    };
}

export function detectDuplicateRoutes(entries: readonly LessonExportEntry[]): readonly LessonExportFinding[] {
    return detectDuplicates(entries, (entry) => normalizeFindingRoute(entry.route), "duplicate-route", "route");
}

export function detectDuplicateExportRoutes(entries: readonly LessonExportEntry[]): readonly LessonExportFinding[] {
    return detectDuplicates(entries, (entry) => entry.exportRoute, "duplicate-export-route", "exportRoute");
}

export function detectDuplicateOutputPaths(entries: readonly LessonExportEntry[]): readonly LessonExportFinding[] {
    return detectDuplicates(entries, (entry) => entry.outputPath, "duplicate-output-path", "outputPath");
}

export function detectUnsafeOutputPaths(entries: readonly LessonExportEntry[]): readonly LessonExportFinding[] {
    return entries
        .filter((entry) => !isSafePdfOutputPath(entry.outputPath))
        .map((entry) => ({
            kind: "unsafe-output-path",
            severity: "error",
            message: `PDF output path is not allowed: ${entry.outputPath}`,
            route: entry.route,
            field: "outputPath",
            value: entry.outputPath,
        }));
}

function validateGeneratedAt(generatedAt: string): readonly LessonExportFinding[] {
    return isIsoDateTime(generatedAt)
        ? []
        : [{
            kind: "invalid-generated-at",
            severity: "error",
            message: "Manifest generatedAt must be an ISO date-time string.",
            field: "generatedAt",
            value: generatedAt,
        }];
}

function validateEntries(entries: readonly LessonExportEntry[]): readonly LessonExportFinding[] {
    return entries.flatMap((entry) => [
        ...validateRequiredText(entry, "title", "missing-title", "Lesson title is required."),
        ...validateRequiredText(entry, "sourceFile", "missing-source-file", "Lesson source file is required."),
        ...validateRouteFamily(entry),
        ...validateLastModified(entry),
    ]);
}

function validateRequiredText(
    entry: LessonExportEntry,
    field: "title" | "sourceFile",
    kind: "missing-title" | "missing-source-file",
    message: string,
): readonly LessonExportFinding[] {
    return entry[field].trim().length > 0
        ? []
        : [{ kind, severity: "error", message, route: entry.route, field, value: entry[field] }];
}

function validateRouteFamily(entry: LessonExportEntry): readonly LessonExportFinding[] {
    let normalizedRoute: string;
    try {
        normalizedRoute = normalizeLessonRoute(entry.route);
    } catch (error) {
        return [{
            kind: "unsupported-route",
            severity: "error",
            message: error instanceof Error ? error.message : "Lesson route is not supported.",
            route: entry.route,
            field: "route",
            value: entry.route,
        }];
    }

    return normalizedRoute.startsWith("/notes/")
        ? []
        : [{
            kind: "unsupported-route",
            severity: "error",
            message: `Only /notes/ routes are supported: ${entry.route}`,
            route: entry.route,
            field: "route",
            value: entry.route,
        }];
}

function validateLastModified(entry: LessonExportEntry): readonly LessonExportFinding[] {
    if (entry.lastModified === undefined || isIsoDateTime(entry.lastModified)) {
        return [];
    }

    return [{
        kind: "invalid-last-modified",
        severity: "error",
        message: "Entry lastModified must be an ISO date-time string when present.",
        route: entry.route,
        field: "lastModified",
        value: entry.lastModified,
    }];
}

function detectDuplicates(
    entries: readonly LessonExportEntry[],
    getValue: (entry: LessonExportEntry) => string,
    kind: "duplicate-route" | "duplicate-export-route" | "duplicate-output-path",
    field: string,
): readonly LessonExportFinding[] {
    const counts = new Map<string, number>();
    for (const entry of entries) {
        const value = getValue(entry);
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    return entries
        .filter((entry) => (counts.get(getValue(entry)) ?? 0) > 1)
        .map((entry) => ({
            kind,
            severity: "error",
            message: `Duplicate ${field}: ${getValue(entry)}`,
            route: entry.route,
            field,
            value: getValue(entry),
        }));
}

function normalizeFindingRoute(route: string): string {
    try {
        return normalizeLessonRoute(route);
    } catch {
        return route;
    }
}

function isIsoDateTime(value: string): boolean {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && /^\d{4}-\d{2}-\d{2}T/u.test(value);
}
