import { type LessonExportFindingKind, normalizeExportFindingKind } from "./findings";

export type LessonExportReportStatus = "exported" | "failed" | "skipped";

export interface LessonExportReportFindingLike {
    readonly kind?: unknown;
    readonly code?: unknown;
}

export interface LessonExportReportErrorLike {
    readonly kind?: unknown;
}

export interface LessonExportReportEntryLike {
    readonly status: LessonExportReportStatus;
    readonly findings?: readonly LessonExportReportFindingLike[];
    readonly error?: LessonExportReportErrorLike;
}

export interface LessonExportStatusCounts {
    readonly exported: number;
    readonly failed: number;
    readonly skipped: number;
}

export type LessonExportKindCounts = Partial<Record<LessonExportFindingKind, number>>;

export type LessonExportFailurePolicy = "any" | readonly unknown[];

export interface LessonExportSummary extends LessonExportStatusCounts {
    readonly selected: number;
    readonly findings: number;
    readonly findingsByKind: LessonExportKindCounts;
    readonly failuresByKind: LessonExportKindCounts;
}

export function countEntriesByStatus(
    entries: readonly LessonExportReportEntryLike[],
): LessonExportStatusCounts {
    return entries.reduce<MutableLessonExportStatusCounts>(
        (counts, entry) => ({
            ...counts,
            [entry.status]: counts[entry.status] + 1,
        }),
        createEmptyStatusCounts(),
    );
}

export function countFindingsByKind(
    entries: readonly LessonExportReportEntryLike[],
): LessonExportKindCounts {
    const counts: MutableLessonExportKindCounts = {};

    for (const entry of entries) {
        for (const finding of entry.findings ?? []) {
            addKindCount(counts, finding.kind ?? finding.code);
        }
    }

    return counts;
}

export function countFailuresByKind(
    entries: readonly LessonExportReportEntryLike[],
): LessonExportKindCounts {
    const counts: MutableLessonExportKindCounts = {};

    for (const entry of entries) {
        addKindCount(counts, entry.error?.kind);
    }

    return counts;
}

export function buildExportSummary(
    entries: readonly LessonExportReportEntryLike[],
): LessonExportSummary {
    const statusCounts = countEntriesByStatus(entries);
    const findingsByKind = countFindingsByKind(entries);

    return {
        selected: entries.length,
        ...statusCounts,
        findings: sumKindCounts(findingsByKind),
        findingsByKind,
        failuresByKind: countFailuresByKind(entries),
    };
}

export function hasFatalExportFindings(
    entries: readonly LessonExportReportEntryLike[],
    failOn: LessonExportFailurePolicy,
): boolean {
    if (failOn === "any") {
        return entries.some((entry) => (entry.findings ?? []).length > 0);
    }

    if (failOn.length === 0) {
        return false;
    }

    const fatalKinds = new Set<LessonExportFindingKind>();
    for (const value of failOn) {
        const kind = normalizeExportFindingKind(value);
        if (kind !== undefined) {
            fatalKinds.add(kind);
        }
    }

    if (fatalKinds.size === 0) {
        return false;
    }

    for (const entry of entries) {
        for (const finding of entry.findings ?? []) {
            const kind = normalizeFindingKind(finding);
            if (kind !== undefined && fatalKinds.has(kind)) {
                return true;
            }
        }
    }

    return false;
}

type MutableLessonExportStatusCounts = {
    -readonly [Key in keyof LessonExportStatusCounts]: LessonExportStatusCounts[Key];
};

type MutableLessonExportKindCounts = Partial<Record<LessonExportFindingKind, number>>;

function createEmptyStatusCounts(): MutableLessonExportStatusCounts {
    return {
        exported: 0,
        failed: 0,
        skipped: 0,
    };
}

function addKindCount(counts: MutableLessonExportKindCounts, value: unknown): void {
    const kind = normalizeExportFindingKind(value);
    if (kind === undefined) {
        return;
    }

    counts[kind] = (counts[kind] ?? 0) + 1;
}

function sumKindCounts(counts: LessonExportKindCounts): number {
    return Object.values(counts).reduce((total, count) => total + (count ?? 0), 0);
}

function normalizeFindingKind(finding: LessonExportReportFindingLike): LessonExportFindingKind | undefined {
    return normalizeExportFindingKind(finding.kind ?? finding.code);
}
