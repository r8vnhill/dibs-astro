/**
 * Public barrel for the domain layer.
 *
 * This module defines the stable public import surface for domain code. It re-exports the domain concepts that 
 * application, presentation, and infrastructure layers are expected to consume directly, while keeping the internal 
 * folder structure private.
 *
 * ## Why this module exists
 *
 * Routing external imports through a single entry point provides several practical benefits:
 *
 * - it gives other layers a compact, predictable import path;
 * - it reduces coupling to the internal layout of the domain package;
 * - it makes internal refactors less disruptive;
 * - it signals which domain symbols are intended to be public.
 *
 * ## Export groups
 *
 * This barrel exposes the following domain concerns:
 *
 * - **lesson entities**: core lesson models and trail representations;
 * - **lesson metadata**: pathname normalization, date parsing, and date display rules;
 * - **lesson navigation**: value objects and services for lesson identity, paths, and adjacency;
 * - **reference content**: classification, normalization, validation, and resolution of rendered reference content.
 *
 * ## Usage
 *
 * Prefer importing from this module when consuming domain concepts from outside the domain layer.
 *
 * Internal domain modules may still use deeper imports when doing so avoids circular dependencies or keeps 
 * implementation details local.
 */
export { Lesson, type LessonProps } from "./entities/Lesson";
export { LessonTrail, type TrailNode } from "./entities/LessonTrail";
export {
    DEFAULT_LESSON_METADATA_LOCALE,
    formatDate,
    formatLessonDate,
    normalizeLessonMetadataPathname,
    parseIsoShortDate,
    resolveLessonDateDisplay,
    UNKNOWN_LESSON_DATE_LABEL,
    type LessonDateDisplayResult
} from "./lesson-metadata";
export {
    classifyRenderedReferenceContent,
    decodeHtmlWhitespaceEntities,
    hasMeaningfulTextContent,
    isMeaningfulSlotContent,
    normalizeFallbackText,
    normalizeHref,
    normalizeInlineWhitespace,
    resolveInlineField,
    resolveLinkedInlineField,
    resolveRequiredInlineField,
    stripHtmlComments,
    stripHtmlTags,
    type ResolvedInlineField,
    type ResolvedLinkedInlineField,
    type ResolvedRequiredInlineField,
    type ResolvedSlotContent
} from "./reference-content";
export type { LessonNavigationRepository } from "./repositories";
export { LessonSequenceService } from "./services/LessonSequenceService";
export { AdjacentLessons, type NavigationNode } from "./value-objects/AdjacentLessons";
export { LessonHref } from "./value-objects/LessonHref";
export { LessonId } from "./value-objects/LessonId";
export { LessonSlug } from "./value-objects/LessonSlug";
export { LessonTitle } from "./value-objects/LessonTitle";
