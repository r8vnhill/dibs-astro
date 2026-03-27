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
    formatPageReference,
    pageReferenceFromBounds,
    isValidPageNumber,
    normalizePageReference,
} from "./pages";
export {
    extractFallbackTitles,
    parseBibliography,
    resolveReferenceGroups,
} from "./normalize-jsonld";
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
export type { PageReference } from "./pages";
