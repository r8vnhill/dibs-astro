import type { BibliographyCatalog, NormalizedReference } from "~/lib/bibliography";

export type ReferenceId = string & { readonly __referenceId: unique symbol };

export type ReadingRole = "Base conceptual" | "Sistemas de construcción" | "Profundización";
export type ReadingType = "Conceptual" | "Aplicada" | "Fuente primaria" | "Referencia técnica";
export type ReadingFormat = "Libro" | "Artículo de investigación" | "Página web" | "Video" | "Tesis";
export type ReadingDifficulty = "Introductoria" | "Intermedia" | "Avanzada";
export type ReadingExtent = "Corta" | "Media" | "Secciones seleccionadas";

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

export function resolveLessonReadings(
    configuration: {
        readonly lessonPath: string;
        readonly title: string;
        readonly essential: readonly (LessonReadingGuide & { readonly referenceId: string })[];
        readonly practice: readonly (LessonReadingGuide & { readonly referenceId: string })[];
        readonly deeper: readonly (LessonReadingGuide & { readonly referenceId: string })[];
    },
    catalog: BibliographyCatalog,
): LessonReadingsResolution {
    const diagnostics: LessonReadingDiagnostic[] = [];
    const seen = new Set<string>();
    const sections = [
        { id: "essential-heading", title: "Lecturas esenciales", readings: configuration.essential },
        { id: "practice-heading", title: "De la idea a la práctica", readings: configuration.practice },
        { id: "deeper-heading", title: "Para profundizar", readings: configuration.deeper },
    ] as const;

    const resolvedSections = sections.map((section) => {
        const readings: ResolvedLessonReading[] = [];
        for (const reading of section.readings) {
            let canonicalId: ReferenceId;
            try {
                canonicalId = normalizeReferenceId(reading.referenceId);
            } catch {
                diagnostics.push({
                    code: "invalid-reference-id",
                    lessonPath: configuration.lessonPath,
                    section: section.title,
                    configuredId: reading.referenceId,
                });
                continue;
            }

            if (seen.has(canonicalId)) {
                diagnostics.push({
                    code: "duplicate-reference",
                    lessonPath: configuration.lessonPath,
                    section: section.title,
                    configuredId: reading.referenceId,
                    canonicalId,
                });
                continue;
            }
            seen.add(canonicalId);

            const reference = catalog.referencesById.get(canonicalId);
            if (!reference) {
                diagnostics.push({
                    code: "missing-reference",
                    lessonPath: configuration.lessonPath,
                    section: section.title,
                    configuredId: reading.referenceId,
                    canonicalId,
                });
                continue;
            }

            readings.push({
                referenceId: canonicalId,
                reference,
                guide: reading,
                anchorId: `ref-${canonicalId.slice(4)}`,
            });
        }
        return { ...section, readings };
    });

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

export function formatLessonReadingsDiagnostics(diagnostics: readonly LessonReadingDiagnostic[]): string {
    return diagnostics
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
}
