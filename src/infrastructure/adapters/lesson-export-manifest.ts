import { courseStructure, flattenLessons, type FlattenedLesson, type Lesson } from "~/data/course-structure";
import {
    createExportFinding,
    deriveExportRoute,
    derivePdfOutputPath,
    normalizeLessonRoute,
    validateManifest,
    type LessonExportEntry,
    type LessonExportFinding,
    type LessonExportManifest,
} from "@ravenhill/lesson-export-core";
import { getLessonMetadataDataset, parseIsoShortDate } from "~/utils/lesson-metadata";
import { getLessonPageRegistry, type LessonPageRegistry } from "~/infrastructure/adapters/lesson-page-registry";

export type LessonExportManifestEntry = LessonExportEntry;

const defaultMetadataDataset = getLessonMetadataDataset();
const defaultLessonPageRegistry = getLessonPageRegistry();

export function getPdfLessonExportManifest(): LessonExportManifest {
    return assertValidPdfLessonExportManifest({
        generatedAt: defaultMetadataDataset.generatedAt,
        entries: getPdfLessonExportEntries(),
    });
}

export function getPdfLessonExportEntries(): readonly LessonExportManifestEntry[] {
    return buildPdfLessonExportEntries(courseStructure, defaultMetadataDataset, defaultLessonPageRegistry);
}

export function assertValidPdfLessonExportManifest(
    manifest: LessonExportManifest,
): LessonExportManifest {
    const validation = validateManifest(manifest);
    const errors = validation.findings.filter((finding) => finding.severity === "error");

    if (errors.length > 0) {
        throw new Error(formatManifestValidationError(errors));
    }

    return manifest;
}

export function buildPdfLessonExportEntries(
    lessons: readonly Lesson[],
    metadataDataset = defaultMetadataDataset,
    lessonPageRegistry: LessonPageRegistry = defaultLessonPageRegistry,
): readonly LessonExportManifestEntry[] {
    return flattenLessons(lessons)
        .filter(hasLessonHref)
        .map((lesson) => toPdfLessonExportEntry(lesson, metadataDataset, lessonPageRegistry))
        .filter((entry): entry is LessonExportManifestEntry => entry !== undefined);
}

function hasLessonHref(lesson: FlattenedLesson): lesson is FlattenedLesson & { readonly href: string } {
    return lesson.href !== undefined;
}

function toPdfLessonExportEntry(
    lesson: FlattenedLesson & { readonly href: string },
    metadataDataset = defaultMetadataDataset,
    lessonPageRegistry: LessonPageRegistry = defaultLessonPageRegistry,
): LessonExportManifestEntry | undefined {
    const route = normalizeLessonRoute(lesson.href);
    if (!route.startsWith("/notes/")) {
        return undefined;
    }

    const page = lessonPageRegistry.resolve(route);
    const metadata = metadataDataset.entries[route];
    const findings: LessonExportFinding[] = [];

    if (!metadata) {
        findings.push(createExportFinding({
            kind: "missing-generated-metadata",
            severity: "warning",
            message: `No generated lesson metadata found for ${route}.`,
            route,
            field: "metadata",
            value: route,
        }));
    }

    const lastModified = metadata?.lastModified ? parseIsoShortDate(metadata.lastModified)?.toISOString() : undefined;
    const authors = metadata?.authors.map((author) => author.name);

    return {
        route,
        exportRoute: deriveExportRoute(route),
        title: lesson.title,
        sourceFile: page.sourceFile,
        outputPath: derivePdfOutputPath(route),
        ...(authors && authors.length > 0 ? { authors } : {}),
        ...(lastModified ? { lastModified } : {}),
        ...(findings.length > 0 ? { findings: Object.freeze(findings) } : {}),
    };
}

function formatManifestValidationError(findings: readonly LessonExportFinding[]): string {
    return `PDF lesson export manifest is invalid:\n- ${findings.map((finding) => finding.message).join("\n- ")}`;
}
