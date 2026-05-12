export type LessonExportFindingSeverity = "info" | "warning" | "error";

export const exportFindingKinds = [
    "duplicate-route",
    "duplicate-export-route",
    "duplicate-output-path",
    "missing-title",
    "missing-source-file",
    "missing-generated-metadata",
    "unsafe-output-path",
    "unsupported-route",
    "invalid-generated-at",
    "invalid-last-modified",
    "pdf-generation-failed",
    "client-only-island",
    "hidden-content",
    "unresolved-todo",
] as const;

export type LessonExportFindingKind = (typeof exportFindingKinds)[number];

export interface LessonExportFinding {
    readonly kind: LessonExportFindingKind;
    readonly severity: LessonExportFindingSeverity;
    readonly message: string;
    readonly route?: string;
    readonly field?: string;
    readonly value?: string;
}

export function createExportFinding(finding: LessonExportFinding): LessonExportFinding {
    return finding;
}

export function isExportFindingKind(value: unknown): value is LessonExportFindingKind {
    return typeof value === "string" && exportFindingKinds.includes(value as LessonExportFindingKind);
}

export function normalizeExportFindingKind(value: unknown): LessonExportFindingKind | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();
    if (trimmed === "client-only") {
        return "client-only-island";
    }

    return isExportFindingKind(trimmed) ? trimmed : undefined;
}
