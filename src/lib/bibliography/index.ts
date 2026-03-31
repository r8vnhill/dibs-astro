/**
 * Public entrypoint for the bibliography subsystem.
 *
 * This barrel groups the module into three API slices:
 * - catalog loading and query helpers from `catalog.ts`
 * - page-reference parsing and formatting helpers from `pages.ts`
 * - JSON-LD normalization helpers from `normalize-jsonld.ts`
 *
 * Import from this file when a caller depends on bibliography functionality as a subsystem rather
 * than on one implementation file. Internal modules can still import leaf files directly when they
 * need to avoid circular dependencies or use local-only helpers.
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
export {
    extractFallbackTitles,
    parseBibliography,
    resolveReferenceGroups,
} from "./normalize-jsonld";
export {
    formatPageReference,
    isValidPageNumber,
    normalizePageReference,
    parsePageReference,
    parsePageReferenceInput,
} from "./pages";
export type {
    PageFormatOptions,
    PageReference,
    UnsafePageReference as PageReferenceInput,
} from "./pages";
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
