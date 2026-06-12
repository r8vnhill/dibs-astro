import type { LessonExportEntry, LessonExportManifest } from "./manifest";
import { normalizeLessonRoute } from "./routes";

export type BookExportTargetKind = "full-course" | "unit";

export type BookExportFindingCode = "duplicate-manifest-route" | "missing-input" | "unsafe-output-path";

export type BookExportFindingSeverity = "warning" | "error";

export interface BookExportCourseEntry {
    readonly id: string;
    readonly title: string;
    readonly kind: "link" | "group";
    readonly href?: string;
    readonly children?: readonly BookExportCourseEntry[];
}

export type BookExportCourseTree = readonly BookExportCourseEntry[];

export interface BookExportLessonEntry {
    readonly id: string;
    readonly title: string;
    readonly route: string;
    readonly pdfPath: string;
}

export interface BookExportFinding {
    readonly code: BookExportFindingCode;
    readonly severity: BookExportFindingSeverity;
    readonly message: string;
    readonly targetId?: string;
    readonly lessonId?: string;
    readonly route?: string;
    readonly path?: string;
}

export interface BookExportTarget {
    readonly id: string;
    readonly title: string;
    readonly kind: BookExportTargetKind;
    readonly outputPath: string;
    readonly lessons: readonly BookExportLessonEntry[];
    readonly findings: readonly BookExportFinding[];
}

export interface BookExportPlan {
    readonly targets: readonly BookExportTarget[];
    readonly findings: readonly BookExportFinding[];
}

export interface PlanBookExportsOptions {
    readonly course: BookExportCourseTree;
    readonly manifest: LessonExportManifest;
    readonly outDir: string;
    readonly availablePdfPaths: ReadonlySet<string>;
    readonly fullCourse?: {
        readonly id?: string;
        readonly title: string;
    };
}

export function planBookExports(options: PlanBookExportsOptions): BookExportPlan {
    const manifestIndex = createManifestIndex(options.manifest);
    const manifestByRoute = manifestIndex.entriesByRoute;
    const lessons = collectExportableLessonEntries(options.course, manifestByRoute);

    if (lessons.length === 0) {
        return {
            targets: [],
            findings: manifestIndex.findings,
        };
    }

    const fullCourseTarget = createFullCourseTarget(options, lessons);
    const unitTargets = createUnitTargets(options, options.course, manifestByRoute);
    const targetResults = [fullCourseTarget, ...unitTargets];

    return {
        targets: targetResults.flatMap((result) => result.target ?? []),
        findings: [
            ...manifestIndex.findings,
            ...targetResults.flatMap((result) => result.findings),
        ],
    };
}

interface BookExportTargetResult {
    readonly target?: BookExportTarget;
    readonly findings: readonly BookExportFinding[];
}

function createFullCourseTarget(
    options: PlanBookExportsOptions,
    lessons: readonly BookExportLessonEntry[],
): BookExportTargetResult {
    const id = options.fullCourse?.id ?? "full-course";
    const outputPath = createSafeBookOutputPath({
        outDir: options.outDir,
        targetId: id,
        targetKind: "full-course",
    });

    if (outputPath.finding !== undefined) {
        return { findings: [outputPath.finding] };
    }

    const findings = createMissingInputFindings(id, lessons, options.availablePdfPaths);

    return {
        findings,
        target: {
            id,
            title: options.fullCourse?.title ?? "Full Course",
            kind: "full-course",
            outputPath: outputPath.path,
            lessons,
            findings,
        },
    };
}

function createUnitTargets(
    options: PlanBookExportsOptions,
    course: BookExportCourseTree,
    manifestByRoute: ReadonlyMap<string, ManifestIndexEntry>,
): readonly BookExportTargetResult[] {
    return course.flatMap((entry) => createUnitTarget(options, entry, manifestByRoute));
}

function createUnitTarget(
    options: PlanBookExportsOptions,
    courseEntry: BookExportCourseEntry,
    manifestByRoute: ReadonlyMap<string, ManifestIndexEntry>,
): readonly BookExportTargetResult[] {
    if (courseEntry.kind !== "group" || courseEntry.children === undefined || courseEntry.children.length === 0) {
        return [];
    }

    const lessons = collectExportableLessonEntries(courseEntry.children, manifestByRoute);
    if (lessons.length === 0) {
        return [];
    }

    const outputPath = createSafeBookOutputPath({
        outDir: options.outDir,
        targetId: courseEntry.id,
        targetKind: "unit",
    });

    if (outputPath.finding !== undefined) {
        return [{ findings: [outputPath.finding] }];
    }

    const findings = createMissingInputFindings(courseEntry.id, lessons, options.availablePdfPaths);

    return [
        {
            findings,
            target: {
                id: courseEntry.id,
                title: courseEntry.title,
                kind: "unit",
                outputPath: outputPath.path,
                lessons,
                findings,
            },
        },
    ];
}

function createMissingInputFindings(
    targetId: string,
    lessons: readonly BookExportLessonEntry[],
    availablePdfPaths: ReadonlySet<string>,
): readonly BookExportFinding[] {
    return lessons
        .filter((lessonEntry) => !availablePdfPaths.has(lessonEntry.pdfPath))
        .map((lessonEntry) => createMissingInputFinding(targetId, lessonEntry));
}

function createMissingInputFinding(targetId: string, lessonEntry: BookExportLessonEntry): BookExportFinding {
    return {
        code: "missing-input",
        severity: "warning",
        message: `Lesson PDF "${lessonEntry.pdfPath}" is required by book target "${targetId}" but is not available.`,
        targetId,
        lessonId: lessonEntry.id,
        route: lessonEntry.route,
        path: lessonEntry.pdfPath,
    };
}

interface SafeBookOutputPathOptions {
    readonly outDir: string;
    readonly targetId: string;
    readonly targetKind: BookExportTargetKind;
}

type SafeBookOutputPathResult =
    | { readonly path: string; readonly finding?: undefined }
    | { readonly path?: undefined; readonly finding: BookExportFinding };

function createSafeBookOutputPath(options: SafeBookOutputPathOptions): SafeBookOutputPathResult {
    if (!isSafeTargetId(options.targetId)) {
        return {
            finding: createUnsafeOutputPathFinding(options.targetId),
        };
    }

    const normalizedOutDir = normalizeOutputPath(options.outDir);
    const relativePath = options.targetKind === "full-course"
        ? "books/full-course.pdf"
        : `books/units/${options.targetId}.pdf`;
    const path = joinOutputPath(normalizedOutDir, relativePath);

    if (!isInsideOutDir(path, normalizedOutDir)) {
        return {
            finding: createUnsafeOutputPathFinding(options.targetId, path),
        };
    }

    return { path };
}

function isSafeTargetId(targetId: string): boolean {
    return /^[A-Za-z0-9._-]+$/.test(targetId) && targetId !== "." && targetId !== "..";
}

function normalizeOutputPath(path: string): string {
    return path.replaceAll("\\", "/").replace(/\/+$/u, "");
}

function joinOutputPath(outDir: string, relativePath: string): string {
    return outDir.length === 0 ? relativePath : `${outDir}/${relativePath}`;
}

function isInsideOutDir(path: string, outDir: string): boolean {
    return outDir.length === 0 || path === outDir || path.startsWith(`${outDir}/`);
}

function createUnsafeOutputPathFinding(targetId: string, path?: string): BookExportFinding {
    const finding: BookExportFinding = {
        code: "unsafe-output-path",
        severity: "error",
        message: `Book target id "${targetId}" cannot be used to create a safe output path.`,
        targetId,
    };

    return path === undefined ? finding : { ...finding, path };
}

interface ManifestIndex {
    readonly entriesByRoute: ReadonlyMap<string, ManifestIndexEntry>;
    readonly findings: readonly BookExportFinding[];
}

interface ManifestIndexEntry {
    readonly entry: LessonExportEntry;
    readonly route: string;
}

function createManifestIndex(manifest: LessonExportManifest): ManifestIndex {
    const entriesByRoute = new Map<string, ManifestIndexEntry>();
    const findings: BookExportFinding[] = [];

    for (const entry of manifest.entries) {
        const normalizedRoute = normalizeLessonRoute(entry.route);
        if (entriesByRoute.has(normalizedRoute)) {
            findings.push(createDuplicateManifestRouteFinding(normalizedRoute, entry.route));
            continue;
        }

        entriesByRoute.set(normalizedRoute, { entry, route: normalizedRoute });
    }

    return { entriesByRoute, findings };
}

function createDuplicateManifestRouteFinding(normalizedRoute: string, duplicateRoute: string): BookExportFinding {
    return {
        code: "duplicate-manifest-route",
        severity: "warning",
        message: `Manifest route "${duplicateRoute}" duplicates normalized route "${normalizedRoute}". The first entry is used.`,
        route: duplicateRoute,
    };
}

function collectExportableLessonEntries(
    course: BookExportCourseTree,
    manifestByRoute: ReadonlyMap<string, ManifestIndexEntry>,
): readonly BookExportLessonEntry[] {
    return course.flatMap((entry) => collectExportableLessonEntry(entry, manifestByRoute));
}

function collectExportableLessonEntry(
    courseEntry: BookExportCourseEntry,
    manifestByRoute: ReadonlyMap<string, ManifestIndexEntry>,
): readonly BookExportLessonEntry[] {
    const ownEntry = createLessonEntry(courseEntry, manifestByRoute);
    const childEntries = collectExportableLessonEntries(courseEntry.children ?? [], manifestByRoute);

    return ownEntry === undefined ? childEntries : [ownEntry, ...childEntries];
}

function createLessonEntry(
    courseEntry: BookExportCourseEntry,
    manifestByRoute: ReadonlyMap<string, ManifestIndexEntry>,
): BookExportLessonEntry | undefined {
    if (courseEntry.href === undefined) {
        return undefined;
    }

    const manifestMatch = manifestByRoute.get(normalizeLessonRoute(courseEntry.href));
    if (manifestMatch === undefined) {
        return undefined;
    }

    return {
        id: courseEntry.id,
        title: manifestMatch.entry.title,
        route: manifestMatch.route,
        pdfPath: manifestMatch.entry.outputPath,
    };
}
