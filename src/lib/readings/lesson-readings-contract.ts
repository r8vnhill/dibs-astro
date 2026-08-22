import type { BibliographyCatalog, NormalizedReference } from "~/lib/bibliography";

export type ReferenceId = string & { readonly __referenceId: unique symbol };

export type ReadingRole = "Base conceptual" | "Sistemas de construcción" | "Profundización";
export type ReadingType = "Conceptual" | "Aplicada" | "Fuente primaria" | "Referencia técnica";
export type ReadingFormat = "Libro" | "Artículo de investigación" | "Página web" | "Video" | "Tesis";
export type ReadingDifficulty = "Introductoria" | "Intermedia" | "Avanzada";
export type ReadingExtent = "Corta" | "Media" | "Secciones seleccionadas";
export type LessonReadingSectionKey = "essential" | "practice" | "deeper";
export type LessonReadingSectionHeadings = Readonly<Partial<Record<LessonReadingSectionKey, string>>>;

export type LessonReadingDiagnostic =
    | {
        readonly code: "invalid-reference-id";
        readonly lessonPath: string;
        readonly section: string;
        readonly configuredId: string;
    }
    | {
        readonly code: "missing-reference";
        readonly lessonPath: string;
        readonly section: string;
        readonly configuredId: string;
        readonly canonicalId: ReferenceId;
    }
    | {
        readonly code: "duplicate-reference";
        readonly lessonPath: string;
        readonly section: string;
        readonly configuredId: string;
        readonly canonicalId: ReferenceId;
    };

export type ResolvedLessonReading = Readonly<{
    referenceId: ReferenceId;
    reference: NormalizedReference;
    guide: LessonReadingGuide;
    anchorId: string;
}>;

export type ResolvedLessonReadingsSection = Readonly<{
    id: string;
    title: string;
    readings: readonly ResolvedLessonReading[];
}>;

export type LessonReadingGuide = Readonly<{
    /** Legacy taxonomy retained for reading pages that have not adopted lesson roles yet. */
    type?: ReadingType;
    role?: ReadingRole;
    difficulty: ReadingDifficulty;
    extent: ReadingExtent;
    /** The exact chapter, section, or part the student should read. */
    whatToRead: string;
    why: string;
    focus: string;
    /** A single question the student should be able to answer after the reading described above. */
    guidingQuestion: string;
}>;

export function readingFormat(referenceType: NormalizedReference["type"]): ReadingFormat {
    switch (referenceType) {
        case "Book":
            return "Libro";
        case "ScholarlyArticle":
            return "Artículo de investigación";
        case "WebPage":
            return "Página web";
        case "VideoObject":
            return "Video";
        case "Thesis":
            return "Tesis";
    }
}

export type LessonReadingsResolution =
    | Readonly<
        {
            ok: true;
            value: Readonly<
                {
                    lessonPath: string;
                    readingsPath: string;
                    title: string;
                    sections: readonly ResolvedLessonReadingsSection[];
                }
            >;
        }
    >
    | Readonly<{ ok: false; diagnostics: readonly LessonReadingDiagnostic[] }>;

const REFERENCE_PREFIX = "ref:";

const defaultSectionHeadings = {
    essential: "Lecturas esenciales",
    practice: "De la idea a la práctica",
    deeper: "Para profundizar",
} as const;

export function normalizeReferenceId(value: string): ReferenceId {
    const trimmed = value.trim();
    const canonical = trimmed.startsWith(REFERENCE_PREFIX) ? trimmed.slice(REFERENCE_PREFIX.length) : trimmed;
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(canonical)) {
        throw new Error(`Invalid bibliography reference ID: ${value}`);
    }
    return `${REFERENCE_PREFIX}${canonical}` as ReferenceId;
}

export function lessonReadingsRoute(lessonPath: string): string {
    const normalized = lessonPath.startsWith("/") ? lessonPath : `/${lessonPath}`;
    if (!normalized.startsWith("/notes/")) {
        throw new Error(`Lesson readings require a canonical /notes/ lesson path: ${lessonPath}`);
    }
    return normalized.replace(/^\/notes\//u, "/readings/");
}

type ConfiguredReading = LessonReadingGuide & { readonly referenceId: string };

export type LessonReadingsConfiguration = Readonly<{
    lessonPath: string;
    title: string;
    essential: readonly ConfiguredReading[];
    practice: readonly ConfiguredReading[];
    deeper: readonly ConfiguredReading[];
    sectionHeadings?: LessonReadingSectionHeadings;
}>;

type UnresolvedSection = Readonly<{ id: string; title: string; readings: readonly ConfiguredReading[] }>;

function buildSections(configuration: LessonReadingsConfiguration): readonly UnresolvedSection[] {
    const headings = { ...defaultSectionHeadings, ...configuration.sectionHeadings };
    return [
        { id: "essential-heading", title: headings.essential, readings: configuration.essential },
        { id: "practice-heading", title: headings.practice, readings: configuration.practice },
        { id: "deeper-heading", title: headings.deeper, readings: configuration.deeper },
    ];
}

function resolveReading(
    lessonPath: string,
    section: UnresolvedSection,
    reading: ConfiguredReading,
    catalog: BibliographyCatalog,
    seen: Set<string>,
    diagnostics: LessonReadingDiagnostic[],
): ResolvedLessonReading | undefined {
    let canonicalId: ReferenceId;
    try {
        canonicalId = normalizeReferenceId(reading.referenceId);
    } catch {
        diagnostics.push({
            code: "invalid-reference-id",
            lessonPath,
            section: section.title,
            configuredId: reading.referenceId,
        });
        return undefined;
    }

    if (seen.has(canonicalId)) {
        diagnostics.push({
            code: "duplicate-reference",
            lessonPath,
            section: section.title,
            configuredId: reading.referenceId,
            canonicalId,
        });
        return undefined;
    }
    seen.add(canonicalId);

    const reference = catalog.referencesById.get(canonicalId);
    if (!reference) {
        diagnostics.push({
            code: "missing-reference",
            lessonPath,
            section: section.title,
            configuredId: reading.referenceId,
            canonicalId,
        });
        return undefined;
    }

    return { referenceId: canonicalId, reference, guide: reading, anchorId: `ref-${canonicalId.slice(4)}` };
}

function resolveSection(
    lessonPath: string,
    section: UnresolvedSection,
    catalog: BibliographyCatalog,
    seen: Set<string>,
    diagnostics: LessonReadingDiagnostic[],
): ResolvedLessonReadingsSection {
    const readings: ResolvedLessonReading[] = [];
    for (const reading of section.readings) {
        const resolved = resolveReading(lessonPath, section, reading, catalog, seen, diagnostics);
        if (resolved) readings.push(resolved);
    }
    return { id: section.id, title: section.title, readings };
}

export function resolveLessonReadings(
    configuration: LessonReadingsConfiguration,
    catalog: BibliographyCatalog,
): LessonReadingsResolution {
    const diagnostics: LessonReadingDiagnostic[] = [];
    const seen = new Set<string>();
    const sections = buildSections(configuration);
    const resolvedSections = sections.map((section) =>
        resolveSection(configuration.lessonPath, section, catalog, seen, diagnostics)
    );

    if (diagnostics.length > 0) return { ok: false, diagnostics };
    return {
        ok: true,
        value: {
            lessonPath: configuration.lessonPath,
            readingsPath: lessonReadingsRoute(configuration.lessonPath),
            title: configuration.title,
            sections: resolvedSections,
        },
    };
}

export const formatLessonReadingsDiagnostics = (diagnostics: readonly LessonReadingDiagnostic[]): string =>
    diagnostics
        .map((diagnostic) => {
            if (diagnostic.code === "invalid-reference-id") {
                return `Invalid bibliography reference ID — ${diagnostic.section}: ${diagnostic.configuredId}`;
            }
            const detail = `${diagnostic.section}: ${diagnostic.configuredId} (${diagnostic.canonicalId})`;
            return diagnostic.code === "missing-reference"
                ? `Missing catalog reference — ${detail}`
                : `Duplicate catalog reference — ${detail}`;
        })
        .join("\n");
