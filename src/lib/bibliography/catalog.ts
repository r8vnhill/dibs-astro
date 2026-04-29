import {
    getMostCitedBooks as getMostCitedBooksCore,
    getMostCitedReferences as getMostCitedReferencesCore,
    getReferenceById as getReferenceByIdCore,
    getReferencesByTag as getReferencesByTagCore,
    getReferencesForLesson as getReferencesForLessonCore,
    getReferenceStats as getReferenceStatsCore,
    getUsagesForReference as getUsagesForReferenceCore,
    loadBibliographyCatalog as loadBibliographyCatalogCore,
    parseCatalogJson as parseCatalogJsonCore,
} from "./catalog-core.mjs";
import type {
    BibliographyCatalog,
    BookCitationStat,
    CatalogUsage,
    GetReferencesForLessonOptions,
    GetReferenceStatsOptions,
    LessonReferenceGroups,
    LoadBibliographyCatalogOptions,
    NormalizedReference,
    ReferenceStat,
    ReferenceTag,
} from "./types";

export const loadBibliographyCatalog = (
    source: unknown,
    options: LoadBibliographyCatalogOptions = {},
): BibliographyCatalog => loadBibliographyCatalogCore(source, options) as BibliographyCatalog;

export const parseCatalogJson = (
    catalogJsonLd: string,
    options: LoadBibliographyCatalogOptions = {},
): BibliographyCatalog => parseCatalogJsonCore(catalogJsonLd, options) as BibliographyCatalog;

export const getReferencesForLesson = (
    catalog: BibliographyCatalog,
    lessonId: string,
    options: GetReferencesForLessonOptions = {},
): LessonReferenceGroups => getReferencesForLessonCore(catalog, lessonId, options) as LessonReferenceGroups;

export const getReferenceById = (
    catalog: BibliographyCatalog,
    referenceId: string,
): NormalizedReference | undefined => getReferenceByIdCore(catalog, referenceId) as NormalizedReference | undefined;

export const getUsagesForReference = (
    catalog: BibliographyCatalog,
    referenceId: string,
): CatalogUsage[] => getUsagesForReferenceCore(catalog, referenceId) as CatalogUsage[];

export const getReferenceStats = (
    catalog: BibliographyCatalog,
    options: GetReferenceStatsOptions = {},
): ReferenceStat[] => getReferenceStatsCore(catalog, options) as ReferenceStat[];

export const getMostCitedReferences = (
    catalog: BibliographyCatalog,
    options: GetReferenceStatsOptions = {},
): ReferenceStat[] => getMostCitedReferencesCore(catalog, options) as ReferenceStat[];

export const getMostCitedBooks = (
    catalog: BibliographyCatalog,
    options: GetReferenceStatsOptions = {},
): BookCitationStat[] => getMostCitedBooksCore(catalog, options) as BookCitationStat[];

export const getReferencesByTag = (
    catalog: BibliographyCatalog,
    tag: ReferenceTag,
): NormalizedReference[] => getReferencesByTagCore(catalog, tag) as NormalizedReference[];
