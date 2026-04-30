import type { NormalizedBookReference, NormalizedReference, PageReference } from "../types";

export type BookNormalizationInput = {
    readonly kind: "Book";
    readonly id: string;
    readonly rawType: string;
    readonly title: string;
    readonly description?: string;
    readonly authors?: NormalizedBookReference["authors"];
    readonly datePublished?: string;
    readonly keywords?: NormalizedBookReference["keywords"];
    readonly publisherName?: string;
    readonly publisherUrl?: string;
    readonly sourceLabel?: string;
    readonly bookTitle: string;
    readonly bookId?: string;
    readonly pages?: PageReference;
};

export type ReferenceNormalizationInput = BookNormalizationInput;

export type NormalizeBookReference = (
    input: BookNormalizationInput,
) => NormalizedBookReference;

export type NormalizeReference = (
    input: ReferenceNormalizationInput,
) => NormalizedReference;
