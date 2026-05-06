/**
 * @packageDocumentation
 *
 * Domain-layer public barrel.
 *
 * This module defines the stable import boundary for domain concepts. Application, infrastructure, and presentation 
 * code should import domain exports from this file instead of reaching into internal folders such as `entities/`,
 * `value-objects/`, or `reference-content/`.
 *
 * Keeping this boundary explicit has three benefits:
 *
 * - consumers depend on a stable domain API rather than the current file layout;
 * - refactors can move internal modules without changing external imports;
 * - architectural checks can treat this file as the approved domain entry point.
 *
 * The exported surface is grouped around three concerns:
 *
 * - lesson entities, represented by {@link Lesson};
 * - lesson value objects, represented by {@link LessonId}, {@link LessonSlug}, and {@link LessonTitle};
 * - reference-content utilities for classifying, normalizing, and resolving inline content used by reference-rendering 
 *   workflows.
 *
 * Reference-content helpers live in the domain layer because they encode pure content semantics: meaningful text 
 * detection, HTML comment/tag stripping, whitespace normalization, fallback resolution, and link normalization. They do
 * not depend on Astro, DOM APIs, UI components, generated data, or host-specific infrastructure.
 */

export { Lesson, type LessonProps } from "./entities/Lesson";

export {
    classifyRenderedReferenceContent,
    decodeHtmlWhitespaceEntities,
    hasMeaningfulTextContent,
    isMeaningfulSlotContent,
    normalizeFallbackText,
    normalizeHref,
    normalizeInlineWhitespace,
    type ResolvedInlineField,
    type ResolvedLinkedInlineField,
    type ResolvedRequiredInlineField,
    type ResolvedSlotContent,
    resolveInlineField,
    resolveLinkedInlineField,
    resolveRequiredInlineField,
    stripHtmlComments,
    stripHtmlTags,
} from "./reference-content";

export { LessonId } from "./value-objects/LessonId";
export { LessonSlug } from "./value-objects/LessonSlug";
export { LessonTitle } from "./value-objects/LessonTitle";
