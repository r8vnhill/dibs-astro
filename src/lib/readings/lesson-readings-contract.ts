/**
 * @file Contract for lesson reading guides: the editorial types content authors fill in
 * (`src/data/readings/lesson-readings.ts`) and the resolution logic that turns them, plus the shared
 * bibliography catalog, into what a `/readings/` page renders.
 *
 * `resolveLessonReadings` is the main entry point. Everything else in this file supports it: canonicalizing
 * and validating a configured reading's id, looking it up in the catalog, and validating its `effort`
 * evidence (see `ReadingEffortEvidence`) — each producing a typed `LessonReadingDiagnostic` on failure instead
 * of throwing, so a lesson with several problems reports all of them at once.
 */
import type { BibliographyCatalog, NormalizedReference } from "~/lib/bibliography";

export type ReferenceId = string & { readonly __referenceId: unique symbol };

export type ReadingRole = "Base conceptual" | "Sistemas de construcción" | "Profundización";
export type ReadingType = "Conceptual" | "Aplicada" | "Fuente primaria" | "Referencia técnica";
export type ReadingFormat = "Libro" | "Artículo de investigación" | "Página web" | "Video" | "Tesis";
export type ReadingDifficulty = "Introductoria" | "Intermedia" | "Avanzada";
export type LessonReadingSectionKey = "essential" | "practice" | "deeper";
export type LessonReadingSectionHeadings = Readonly<Partial<Record<LessonReadingSectionKey, string>>>;

/**
 * Everything that can go wrong while resolving a lesson's configured readings against the bibliography catalog.
 * {@link resolveLessonReadings} collects every diagnostic across every configured reading rather than stopping
 * at the first one, so a content author sees all problems in a lesson's readings file in one pass.
 */
export type LessonReadingDiagnostic =
    /** `referenceId` is not a syntactically valid reference id (see {@link normalizeReferenceId}). */
    | {
        readonly code: "invalid-reference-id";
        readonly lessonPath: string;
        readonly section: string;
        readonly configuredId: string;
    }
    /** `referenceId` is well-formed but does not exist in the bibliography catalog. */
    | {
        readonly code: "missing-reference";
        readonly lessonPath: string;
        readonly section: string;
        readonly configuredId: string;
        readonly canonicalId: ReferenceId;
    }
    /** The same canonical reference id was configured more than once across a lesson's sections. */
    | {
        readonly code: "duplicate-reference";
        readonly lessonPath: string;
        readonly section: string;
        readonly configuredId: string;
        readonly canonicalId: ReferenceId;
    }
    /** `guide.effort` failed validation — see `reason` for specifics (non-positive value, wrong type, etc). */
    | {
        readonly code: "invalid-effort-evidence";
        readonly lessonPath: string;
        readonly section: string;
        readonly configuredId: string;
        readonly reason: string;
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

/**
 * Effort evidence for the exact excerpt a lesson recommends, not the whole cited work.
 *
 * More than one field may be populated at once (e.g. a book chapter with both `pageCount` and `wordCount`);
 * {@link ../reading-effort#resolveReadingEffort} deterministically picks the highest-priority value available.
 */
export type ReadingEffortEvidence = Readonly<{
    /** Approximate duration of the recommended video material, in whole minutes. Only used for `VideoObject`. */
    durationMinutes?: number;
    /** Number of pages actually recommended by `whatToRead` — not the total page count of the source. */
    pageCount?: number;
    /** Approximate word count of the recommended material; used only when better evidence is unavailable. */
    wordCount?: number;
}>;

export type LessonReadingGuide = Readonly<{
    /** Legacy taxonomy retained for reading pages that have not adopted lesson roles yet. */
    type?: ReadingType;
    role?: ReadingRole;
    difficulty: ReadingDifficulty;
    effort?: ReadingEffortEvidence;
    /** The exact chapter, section, or part the student should read. */
    whatToRead: string;
    why: string;
    focus: string;
    /** A single question the student should be able to answer after the reading described above. */
    guidingQuestion: string;
    /**
     * Short student-facing statement describing the specific extension
     * this reading offers within its broader lesson role.
     */
    purpose?: string;
}>;

export type ConfiguredLessonReading = Readonly<LessonReadingGuide & { referenceId: string }>;

/** Maps a bibliography reference's schema.org-derived `type` to its Spanish student-facing format label. */
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

/**
 * Canonicalizes a configured reference id to its `ref:`-prefixed form (accepting the prefix as optional input)
 * and validates it against the bibliography catalog's id shape. Throws on malformed input; callers resolving a
 * whole lesson (e.g. {@link canonicalizeOrReject}) catch this and turn it into an `invalid-reference-id`
 * diagnostic instead of failing the whole page.
 */
export function normalizeReferenceId(value: string): ReferenceId {
    const trimmed = value.trim();
    const canonical = trimmed.startsWith(REFERENCE_PREFIX) ? trimmed.slice(REFERENCE_PREFIX.length) : trimmed;
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(canonical)) {
        throw new Error(`Invalid bibliography reference ID: ${value}`);
    }
    return `${REFERENCE_PREFIX}${canonical}` as ReferenceId;
}

/** Derives a lesson's `/readings/` page path from its canonical `/notes/` lesson path. */
export function lessonReadingsRoute(lessonPath: string): string {
    const normalized = lessonPath.startsWith("/") ? lessonPath : `/${lessonPath}`;
    if (!normalized.startsWith("/notes/")) {
        throw new Error(`Lesson readings require a canonical /notes/ lesson path: ${lessonPath}`);
    }
    return normalized.replace(/^\/notes\//u, "/readings/");
}

export type LessonReadingsConfiguration = Readonly<{
    lessonPath: string;
    title: string;
    essential: readonly ConfiguredLessonReading[];
    practice: readonly ConfiguredLessonReading[];
    deeper: readonly ConfiguredLessonReading[];
    sectionHeadings?: LessonReadingSectionHeadings;
}>;

type UnresolvedSection = Readonly<{ id: string; title: string; readings: readonly ConfiguredLessonReading[] }>;

/** The `ReadingEffortEvidence` fields, iterated together whenever every field needs the same numeric check. */
const EFFORT_EVIDENCE_FIELDS = ["durationMinutes", "pageCount", "wordCount"] as const;

/** All three `ReadingEffortEvidence` fields represent counts, so all three share this one validity rule. */
const isPositiveWholeNumber = (value: number): boolean =>
    Number.isFinite(value) && Number.isInteger(value) && value > 0;

/**
 * Validates a reading's effort evidence, returning a human-readable rejection reason (for the
 * `invalid-effort-evidence` diagnostic) or `undefined` when the evidence is valid or absent.
 *
 * Two rules are enforced: every configured field must be a positive whole number, and `durationMinutes` is
 * only meaningful — and therefore only accepted — on a `VideoObject` reference. Rejecting bad evidence here
 * means {@link ../readings/reading-effort#resolveReadingEffort} can assume anything it reads is already valid.
 */
function invalidEffortEvidenceReason(
    effort: ReadingEffortEvidence | undefined,
    referenceType: NormalizedReference["type"],
): string | undefined {
    if (!effort) return undefined;

    for (const field of EFFORT_EVIDENCE_FIELDS) {
        const value = effort[field];
        if (value !== undefined && !isPositiveWholeNumber(value)) {
            return `\`${field}\` must be a positive whole number, got ${value}.`;
        }
    }

    if (effort.durationMinutes !== undefined && referenceType !== "VideoObject") {
        return "`durationMinutes` is only valid for a VideoObject reference.";
    }

    return undefined;
}

function buildSections(configuration: LessonReadingsConfiguration): readonly UnresolvedSection[] {
    const headings = { ...defaultSectionHeadings, ...configuration.sectionHeadings };
    return [
        { id: "essential-heading", title: headings.essential, readings: configuration.essential },
        { id: "practice-heading", title: headings.practice, readings: configuration.practice },
        { id: "deeper-heading", title: headings.deeper, readings: configuration.deeper },
    ];
}

/** The fields every `resolveReading` validation step needs, bundled once instead of threaded individually. */
type DiagnosticContext = Readonly<{
    lessonPath: string;
    section: UnresolvedSection;
    reading: ConfiguredLessonReading;
}>;

/** The `{ lessonPath, section, configuredId }` fields every `LessonReadingDiagnostic` variant shares. */
const diagnosticFields = (context: DiagnosticContext) => ({
    lessonPath: context.lessonPath,
    section: context.section.title,
    configuredId: context.reading.referenceId,
});

/** Step 1 of {@link resolveReading}: canonicalize the configured id, or reject it as malformed. */
function canonicalizeOrReject(
    context: DiagnosticContext,
    diagnostics: LessonReadingDiagnostic[],
): ReferenceId | undefined {
    try {
        return normalizeReferenceId(context.reading.referenceId);
    } catch {
        diagnostics.push({ code: "invalid-reference-id", ...diagnosticFields(context) });
        return undefined;
    }
}

/** Step 2 of {@link resolveReading}: reject a canonical id already seen elsewhere in this lesson. */
function rejectIfDuplicate(
    context: DiagnosticContext,
    canonicalId: ReferenceId,
    seen: Set<string>,
    diagnostics: LessonReadingDiagnostic[],
): boolean {
    if (!seen.has(canonicalId)) return false;
    diagnostics.push({ code: "duplicate-reference", ...diagnosticFields(context), canonicalId });
    return true;
}

/** Step 3 of {@link resolveReading}: look up the reference in the bibliography catalog, or reject it. */
function lookupReferenceOrReject(
    context: DiagnosticContext,
    canonicalId: ReferenceId,
    catalog: BibliographyCatalog,
    diagnostics: LessonReadingDiagnostic[],
): NormalizedReference | undefined {
    const reference = catalog.referencesById.get(canonicalId);
    if (reference) return reference;
    diagnostics.push({ code: "missing-reference", ...diagnosticFields(context), canonicalId });
    return undefined;
}

/** Step 4 of {@link resolveReading}: reject invalid `effort` evidence now that the reference type is known. */
function rejectIfInvalidEffort(
    context: DiagnosticContext,
    reference: NormalizedReference,
    diagnostics: LessonReadingDiagnostic[],
): boolean {
    const reason = invalidEffortEvidenceReason(context.reading.effort, reference.type);
    if (!reason) return false;
    diagnostics.push({ code: "invalid-effort-evidence", ...diagnosticFields(context), reason });
    return true;
}

/**
 * Resolves one configured reading against the bibliography catalog, running each validation step in turn and
 * short-circuiting on the first failure. Returns `undefined` (after recording a diagnostic) on any failure, or
 * the fully resolved reading — id, catalog reference, and original guide — on success.
 */
function resolveReading(
    lessonPath: string,
    section: UnresolvedSection,
    reading: ConfiguredLessonReading,
    catalog: BibliographyCatalog,
    seen: Set<string>,
    diagnostics: LessonReadingDiagnostic[],
): ResolvedLessonReading | undefined {
    const context: DiagnosticContext = { lessonPath, section, reading };

    const canonicalId = canonicalizeOrReject(context, diagnostics);
    if (!canonicalId) return undefined;
    if (rejectIfDuplicate(context, canonicalId, seen, diagnostics)) return undefined;
    seen.add(canonicalId);

    const reference = lookupReferenceOrReject(context, canonicalId, catalog, diagnostics);
    if (!reference) return undefined;
    if (rejectIfInvalidEffort(context, reference, diagnostics)) return undefined;

    return { referenceId: canonicalId, reference, guide: reading, anchorId: `ref-${canonicalId.slice(4)}` };
}

/** Resolves every configured reading in a section, skipping (and recording diagnostics for) any that fail. */
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

/**
 * Resolves a lesson's configured readings (from `src/data/readings/lesson-readings.ts`) against the shared
 * bibliography catalog, producing the fully resolved sections a readings page renders, or the complete list of
 * diagnostics if anything failed. This never returns a partial success — either every configured reading
 * resolved cleanly, or `ok` is `false` and nothing in `value` should be trusted.
 */
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

/** Renders a resolution failure's diagnostics as human-readable lines, e.g. for a build-time error message. */
export const formatLessonReadingsDiagnostics = (diagnostics: readonly LessonReadingDiagnostic[]): string =>
    diagnostics
        .map((diagnostic) => {
            if (diagnostic.code === "invalid-reference-id") {
                return `Invalid bibliography reference ID — ${diagnostic.section}: ${diagnostic.configuredId}`;
            }
            if (diagnostic.code === "invalid-effort-evidence") {
                return `Invalid reading effort evidence — ${diagnostic.section}: ${diagnostic.configuredId} `
                    + `(${diagnostic.reason})`;
            }
            const detail = `${diagnostic.section}: ${diagnostic.configuredId} (${diagnostic.canonicalId})`;
            return diagnostic.code === "missing-reference"
                ? `Missing catalog reference — ${detail}`
                : `Duplicate catalog reference — ${detail}`;
        })
        .join("\n");
