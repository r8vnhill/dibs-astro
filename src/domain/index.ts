/**
 * Public domain-layer barrel.
 *
 * This module defines the stable import surface for the domain layer. It re-exports the domain concepts that 
 * application, presentation, and infrastructure code are expected to depend on directly, while keeping the internal 
 * folder structure private.
 *
 * ## Why this module exists
 *
 * Importing domain symbols through a single entry point provides a few practical benefits:
 *
 * - it gives external layers a compact and predictable import path;
 * - it reduces coupling to the internal organization of the domain package;
 * - it makes future refactors of domain files less disruptive;
 * - it communicates which domain types are intended to be part of the public API.
 *
 * ## Export groups
 *
 * This barrel exposes lesson-focused domain concepts and utilities:
 *
 * - lesson entities that represent the core lesson model;
 * - navigation-related value objects used to model lesson identity, paths, and adjacency;
 * - domain services that derive sequencing and navigation behavior from lesson data;
 * - reference-content utilities for HTML parsing, normalization, validation, and classification of rendered lesson
 *   content.
 *
 * ## Usage
 *
 * Prefer importing from this module when consuming domain concepts from outside the domain layer itself. Internal 
 * domain modules may still use deeper imports when that helps avoid circular dependencies or keeps implementation 
 * details local.
 */
export { Lesson, type LessonProps } from "./entities/Lesson";
export { LessonTrail, type TrailNode } from "./entities/LessonTrail";
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
