/**
 * Domain-layer public barrel.
 *
 * This module defines the stable import surface for the domain layer. It re-exports the domain concepts that 
 * application, infrastructure, and presentation code are expected to consume directly, while keeping the internal 
 * folder structure private.
 *
 * Routing external imports through this entry point provides a few practical benefits:
 *
 * - it gives other layers one predictable import path
 * - it reduces coupling to the internal organization of the domain layer
 * - it makes internal refactors less disruptive
 * - it clarifies which domain types and utilities are part of the intended public surface
 *
 * The exports are grouped around a few domain concerns:
 *
 * - lesson entities and trail models
 * - lesson metadata value types and formatting helpers
 * - lesson navigation value objects and repository contracts
 * - reference-content normalization and resolution utilities
 *
 * External layers should prefer importing from this barrel. Internal domain modules may still use deeper imports when 
 * that keeps implementation details private or avoids unnecessary coupling between sibling modules.
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
    type LessonDateDisplayResult,
    type LessonMetadataAuthor,
    type LessonMetadataChange,
    type LessonMetadataRecord
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
export type { LessonMetadataRepository, LessonNavigationRepository } from "./repositories";
export { LessonSequenceService } from "./services/LessonSequenceService";
export { AdjacentLessons, type NavigationNode } from "./value-objects/AdjacentLessons";
export { LessonHref } from "./value-objects/LessonHref";
export { LessonId } from "./value-objects/LessonId";
export { LessonSlug } from "./value-objects/LessonSlug";
export { LessonTitle } from "./value-objects/LessonTitle";
