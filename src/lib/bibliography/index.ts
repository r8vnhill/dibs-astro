/**
 * @file Public entrypoint for the bibliography subsystem.
 *
 * This module exposes the stable bibliography API for consumers that depend on the subsystem as a whole. It 
 * intentionally re-exports three API slices with different responsibilities:
 *
 * - catalog access for pre-built bibliography graphs;
 * - page-reference parsing and formatting;
 * - JSON-LD normalization for flexible external inputs.
 *
 * Prefer importing from this file when application or presentation code needs bibliography functionality without 
 * depending on internal file structure. Lower-level bibliography modules may still import leaf modules directly when
 * doing so avoids circular dependencies or keeps local helper usage explicit.
 *
 * ## Catalog API
 *
 * The catalog slice loads and queries a pre-built bibliography graph.
 *
 * Typical use cases include:
 *
 * - loading generated JSON-LD, such as `catalog.graph.generated.jsonld`;
 * - querying references used by a lesson;
 * - computing reference statistics;
 * - resolving tags, usages, and citation metadata.
 *
 * This API is best suited for read-heavy paths where bibliography data is generated ahead of time and changes 
 * infrequently.
 *
 * ## Page-reference API
 *
 * The page-reference slice provides shared numeric page-reference semantics.
 *
 * The parser-first contract separates loose external data from trusted internal values:
 *
 * - {@link PageReferenceInput} represents untrusted boundary data;
 * - {@link PageReference} represents a validated page reference;
 * - {@link parsePageReference} builds references from numeric bounds;
 * - {@link parsePageReferenceInput} parses object-shaped boundary data;
 * - {@link isPageReference} narrows values already expected to be normalized;
 * - {@link formatPageReference} formats trusted references for presentation.
 *
 * Formatting accepts partial {@link PageFormatOptions}; missing fields are resolved from the default page format.
 *
 * ## JSON-LD normalization API
 *
 * The JSON-LD normalization slice parses raw bibliography data without requiring a pre-built catalog.
 *
 * It accepts JSON-LD-shaped data from flexible sources and normalizes the supported reference types:
 *
 * - `Book`;
 * - `WebPage`;
 * - `VideoObject`;
 * - `ScholarlyArticle`;
 * - `Thesis`.
 *
 * This API is useful for external, ad hoc, or test-local bibliography data that should not go through the generated 
 * catalog pipeline.
 */
export {
    getMostCitedBooks,
    getMostCitedReferences,
    getReferenceById,
    getReferencesByTag,
    getReferencesForLesson,
    getReferenceStats,
    getUsagesForReference,
    loadBibliographyCatalog,
} from "./catalog";
export { extractFallbackTitles, parseBibliography, resolveReferenceGroups } from "./normalize-jsonld";
export {
    formatPageReference,
    isPageReference,
    isValidPageNumber,
    parsePageReference,
    parsePageReferenceInput,
} from "./pages";
export type { PageFormatOptions, PageReference, PageReferenceInput } from "./pages";
export type {
    AuthorRef,
    BibliographyCatalog,
    BibliographyJsonLd,
    BookCitationStat,
    CatalogLesson,
    CatalogUsage,
    GetReferencesForLessonOptions,
    GetReferenceStatsOptions,
    LessonReferenceEntry,
    LessonReferenceGroups,
    LoadBibliographyCatalogOptions,
    NormalizedArticleReference,
    NormalizedBookReference,
    NormalizedReference,
    NormalizedThesisReference,
    NormalizedVideoReference,
    NormalizedWebReference,
    ParseBibliographyOptions,
    ParsedBibliography,
    ReferenceStat,
    ReferenceTag,
    ResolvedReferenceGroups,
    ResolveGroupsOptions,
    SupportedReferenceType,
} from "./types";
