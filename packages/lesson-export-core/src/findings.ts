export type LessonExportFindingSeverity = "info" | "warning" | "error";

export type LessonExportFindingKind =
    | "duplicate-route"
    | "duplicate-export-route"
    | "duplicate-output-path"
    | "missing-title"
    | "missing-source-file"
    | "unsafe-output-path"
    | "unsupported-route"
    | "invalid-generated-at"
    | "invalid-last-modified";

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
