import type {
    AuthorRef,
    NormalizedArticleReference,
    NormalizedBookReference,
    NormalizedReference,
    NormalizedThesisReference,
    NormalizedVideoReference,
    NormalizedWebReference,
    PageReference,
} from "../types";

type BaseReferenceNormalizationInput = {
    readonly id: string;
    readonly rawType: string;
    readonly title: string;
    readonly description?: string;
    readonly authors?: AuthorRef[];
    readonly datePublished?: string;
    readonly keywords?: string[];
    readonly publisherName?: string;
    readonly publisherUrl?: string;
    readonly sourceLabel?: string;
};

export type BookNormalizationInput = BaseReferenceNormalizationInput & {
    readonly kind: "Book";
    readonly bookTitle: string;
    readonly bookId?: string;
    readonly pages?: PageReference;
};

export type VideoNormalizationInput = BaseReferenceNormalizationInput & {
    readonly kind: "VideoObject";
    readonly url: string;
    readonly platform?: string;
    readonly platformUrl?: string;
};

export type WebPageNormalizationInput = BaseReferenceNormalizationInput & {
    readonly kind: "WebPage";
    readonly url: string;
    readonly location?: string;
    readonly locationUrl?: string;
};

export type ScholarlyArticleNormalizationInput = BaseReferenceNormalizationInput & {
    readonly kind: "ScholarlyArticle";
    readonly url: string;
    readonly publication?: string;
    readonly publicationId?: string;
    readonly publicationUrl?: string;
    readonly pages?: PageReference;
};

export type ThesisNormalizationInput = BaseReferenceNormalizationInput & {
    readonly kind: "Thesis";
    readonly url: string;
    readonly institution?: string;
    readonly institutionId?: string;
    readonly institutionUrl?: string;
};

export type ReferenceNormalizationInput =
    | BookNormalizationInput
    | WebPageNormalizationInput
    | VideoNormalizationInput
    | ScholarlyArticleNormalizationInput
    | ThesisNormalizationInput;

export type NormalizeBookReference = (
    input: BookNormalizationInput,
) => NormalizedBookReference;

export type NormalizeVideoReference = (
    input: VideoNormalizationInput,
) => NormalizedVideoReference;

export type NormalizeWebPageReference = (
    input: WebPageNormalizationInput,
) => NormalizedWebReference;

export type NormalizeScholarlyArticleReference = (
    input: ScholarlyArticleNormalizationInput,
) => NormalizedArticleReference;

export type NormalizeThesisReference = (
    input: ThesisNormalizationInput,
) => NormalizedThesisReference;

export type NormalizeReference = (
    input: ReferenceNormalizationInput,
) => NormalizedReference;
