import type { PageReference } from "./pages";

export type SupportedReferenceType = "Book" | "WebPage" | "ScholarlyArticle" | "Thesis";
export type ReferenceTag = "recommended" | "additional" | "pending-revision";
export type { PageReference } from "./pages";

export type AuthorRef = {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    url?: string;
};

export type NormalizedReferenceBase = {
    id: string;
    type: SupportedReferenceType;
    rawType: string;
    title: string;
    description?: string;
    authors: AuthorRef[];
    datePublished?: string;
    keywords: string[];
    publisherName?: string;
    publisherUrl?: string;
    sourceLabel?: string;
};

export type NormalizedBookReference = NormalizedReferenceBase & {
    type: "Book";
    chapter: string;
    bookTitle: string;
    bookId?: string;
    pages?: PageReference;
};

export type NormalizedWebReference = NormalizedReferenceBase & {
    type: "WebPage";
    url: string;
    location?: string;
};

export type NormalizedArticleReference = NormalizedReferenceBase & {
    type: "ScholarlyArticle";
    url: string;
    publication?: string;
    publicationId?: string;
    pages?: PageReference;
};

export type NormalizedThesisReference = NormalizedReferenceBase & {
    type: "Thesis";
    url: string;
    institution?: string;
    institutionId?: string;
};

export type NormalizedReference =
    | NormalizedBookReference
    | NormalizedWebReference
    | NormalizedArticleReference
    | NormalizedThesisReference;

export type BibliographyJsonLd = {
    "@context"?: string | string[];
    "@type"?: string | string[];
    name?: string;
    about?: string;
    itemListElement?: unknown[];
    [key: string]: unknown;
};

export type ParseBibliographyOptions = {
    strict?: boolean;
    sourceLabel?: string;
};

export type ParsedBibliography = {
    name?: string;
    about?: string;
    items: NormalizedReference[];
    byId: Map<string, NormalizedReference>;
};

export type ResolveGroupsOptions = {
    strict?: boolean;
    sourceLabel?: string;
};

export type ResolvedReferenceGroups = {
    recommended: NormalizedReference[];
    additional: NormalizedReference[];
};

export type CatalogLesson = {
    id: string;
    title?: string;
    rawType: string;
    url?: string;
};

export type CatalogUsage = {
    id: string;
    lessonId: string;
    referenceId: string;
    tags: ReferenceTag[];
    rawType: string;
};

export type BibliographyCatalog = {
    references: NormalizedReference[];
    referencesById: Map<string, NormalizedReference>;
    lessons: CatalogLesson[];
    lessonsById: Map<string, CatalogLesson>;
    usages: CatalogUsage[];
    usagesByLessonId: Map<string, CatalogUsage[]>;
    usagesByReferenceId: Map<string, CatalogUsage[]>;
};

export type LoadBibliographyCatalogOptions = {
    strict?: boolean;
    sourceLabel?: string;
};

export type GetReferencesForLessonOptions = {
    includeTags?: ReferenceTag[];
    excludeTags?: ReferenceTag[];
    includePendingRevision?: boolean;
};

export type LessonReferenceEntry = {
    reference: NormalizedReference;
    usage: CatalogUsage;
};

export type LessonReferenceGroups = {
    recommended: LessonReferenceEntry[];
    additional: LessonReferenceEntry[];
    pendingRevision: LessonReferenceEntry[];
};

export type GetReferenceStatsOptions = {
    types?: SupportedReferenceType[];
    includeTags?: ReferenceTag[];
    excludeTags?: ReferenceTag[];
    includePendingRevision?: boolean;
};

export type ReferenceStat = {
    referenceId: string;
    type: SupportedReferenceType;
    title: string;
    citationCount: number;
    lessonCount: number;
    tags: ReferenceTag[];
};

export type BookCitationStat = {
    bookKey: string;
    bookId?: string;
    bookTitle: string;
    citationCount: number;
    lessonCount: number;
    chapterIds: string[];
};
