export type SupportedReferenceType = "Book" | "WebPage";

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
    pages?: [number, number];
};

export type NormalizedWebReference = NormalizedReferenceBase & {
    type: "WebPage";
    url: string;
    location?: string;
};

export type NormalizedReference = NormalizedBookReference | NormalizedWebReference;

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
