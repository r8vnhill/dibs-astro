import type { NormalizedReference } from "~/lib/bibliography";
import { estimateMinutesFromWordCount } from "~/lib/reading-time/estimate-minutes-from-word-count";
import type { LessonReadingGuide } from "./lesson-readings-contract";

/**
 * The effort evidence resolved for a reading, expressed as a typed semantic value rather than localized prose.
 * Presentation code (e.g. `formatReadingEffort` in `src/components/ui/references`) is responsible for turning
 * this into student-facing text — this module never produces Spanish (or any other) UI strings itself.
 */
export type ResolvedReadingEffort =
    /** The recommended material is a video with a known duration; `minutes` is a whole-minute value. */
    | Readonly<{ kind: "duration"; minutes: number }>
    /** The recommended material has a known page count for the excerpt (not the whole cited work). */
    | Readonly<{ kind: "pages"; pages: number }>
    /** No duration or page evidence exists; `minutes` was derived from a curated word count. */
    | Readonly<{ kind: "estimated-reading-time"; minutes: number }>
    /** No usable effort evidence was configured for this reading. */
    | Readonly<{ kind: "unavailable" }>;

/**
 * Resolves the best available effort evidence for a reading, following a fixed priority:
 * video duration → recommended-page count → recommended-section word count → unavailable.
 *
 * Multiple evidence fields may be configured on the same `guide.effort` (e.g. a book chapter with both a page
 * count and a word count); this function deterministically picks the single highest-priority one and ignores
 * the rest — callers never need to reimplement the priority order themselves.
 *
 * `durationMinutes` is only treated as duration evidence when the underlying reference is a video — for any
 * other reference type it is ignored here (the lesson-readings contract rejects configuring it in the first
 * place, but this resolver stays defensive rather than assuming that validation always ran first).
 */
export function resolveReadingEffort(
    guide: LessonReadingGuide,
    referenceType: NormalizedReference["type"],
): ResolvedReadingEffort {
    const evidence = guide.effort;
    if (!evidence) return { kind: "unavailable" };

    if (referenceType === "VideoObject" && evidence.durationMinutes !== undefined) {
        return { kind: "duration", minutes: evidence.durationMinutes };
    }

    if (evidence.pageCount !== undefined) {
        return { kind: "pages", pages: evidence.pageCount };
    }

    if (evidence.wordCount !== undefined) {
        return { kind: "estimated-reading-time", minutes: estimateMinutesFromWordCount(evidence.wordCount) };
    }

    return { kind: "unavailable" };
}
