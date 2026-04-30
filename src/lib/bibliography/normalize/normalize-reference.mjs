/**
 * @typedef {import("../types").NormalizedArticleReference} NormalizedArticleReference
 * @typedef {import("../types").NormalizedBookReference} NormalizedBookReference
 * @typedef {import("../types").NormalizedReference} NormalizedReference
 * @typedef {import("../types").NormalizedThesisReference} NormalizedThesisReference
 * @typedef {import("../types").NormalizedVideoReference} NormalizedVideoReference
 * @typedef {import("../types").NormalizedWebReference} NormalizedWebReference
 * @typedef {import("./normalize-reference-types").BookNormalizationInput} BookNormalizationInput
 * @typedef {import("./normalize-reference-types").ReferenceNormalizationInput} ReferenceNormalizationInput
 * @typedef {import("./normalize-reference-types").ScholarlyArticleNormalizationInput} ScholarlyArticleNormalizationInput
 * @typedef {import("./normalize-reference-types").ThesisNormalizationInput} ThesisNormalizationInput
 * @typedef {import("./normalize-reference-types").VideoNormalizationInput} VideoNormalizationInput
 * @typedef {import("./normalize-reference-types").WebPageNormalizationInput} WebPageNormalizationInput
 */

const defineOptional = (target, key, value) => {
    if (value !== undefined) {
        target[key] = value;
    }
};

const fallbackToReferenceUrl = (explicitUrl, referenceUrl) => explicitUrl ?? referenceUrl;

const getLocationFromUrl = (url) => {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
};

/**
 * @param {BookNormalizationInput} input
 * @returns {NormalizedBookReference}
 */
export const normalizeBookReference = (input) => {
    const reference = {
        id: input.id,
        type: "Book",
        rawType: input.rawType,
        title: input.title,
        chapter: input.title,
        bookTitle: input.bookTitle,
        authors: input.authors ?? [],
        keywords: input.keywords ?? [],
    };

    defineOptional(reference, "description", input.description);
    defineOptional(reference, "datePublished", input.datePublished);
    defineOptional(reference, "publisherName", input.publisherName);
    defineOptional(reference, "publisherUrl", input.publisherUrl);
    defineOptional(reference, "sourceLabel", input.sourceLabel);
    defineOptional(reference, "bookId", input.bookId);
    defineOptional(reference, "pages", input.pages);

    return reference;
};

/**
 * @param {VideoNormalizationInput} input
 * @returns {NormalizedVideoReference}
 */
export const normalizeVideoReference = (input) => {
    const reference = {
        id: input.id,
        type: "VideoObject",
        rawType: input.rawType,
        title: input.title,
        url: input.url,
        platform: input.platform ?? input.publisherName ?? getLocationFromUrl(input.url),
        platformUrl: fallbackToReferenceUrl(input.platformUrl ?? input.publisherUrl, input.url),
        authors: input.authors ?? [],
        keywords: input.keywords ?? [],
    };

    defineOptional(reference, "description", input.description);
    defineOptional(reference, "datePublished", input.datePublished);
    defineOptional(reference, "publisherName", input.publisherName);
    defineOptional(reference, "publisherUrl", input.publisherUrl);
    defineOptional(reference, "sourceLabel", input.sourceLabel);

    return reference;
};

/**
 * @param {WebPageNormalizationInput} input
 * @returns {NormalizedWebReference}
 */
export const normalizeWebPageReference = (input) => {
    const reference = {
        id: input.id,
        type: "WebPage",
        rawType: input.rawType,
        title: input.title,
        url: input.url,
        location: input.location ?? input.publisherName ?? getLocationFromUrl(input.url),
        locationUrl: fallbackToReferenceUrl(input.locationUrl ?? input.publisherUrl, input.url),
        authors: input.authors ?? [],
        keywords: input.keywords ?? [],
    };

    defineOptional(reference, "description", input.description);
    defineOptional(reference, "datePublished", input.datePublished);
    defineOptional(reference, "publisherName", input.publisherName);
    defineOptional(reference, "publisherUrl", input.publisherUrl);
    defineOptional(reference, "sourceLabel", input.sourceLabel);

    return reference;
};

/**
 * @param {ScholarlyArticleNormalizationInput} input
 * @returns {NormalizedArticleReference}
 */
export const normalizeScholarlyArticleReference = (input) => {
    const reference = {
        id: input.id,
        type: "ScholarlyArticle",
        rawType: input.rawType,
        title: input.title,
        url: input.url,
        publicationUrl: fallbackToReferenceUrl(input.publicationUrl, input.url),
        authors: input.authors ?? [],
        keywords: input.keywords ?? [],
    };

    defineOptional(reference, "description", input.description);
    defineOptional(reference, "datePublished", input.datePublished);
    defineOptional(reference, "publisherName", input.publisherName);
    defineOptional(reference, "publisherUrl", input.publisherUrl);
    defineOptional(reference, "sourceLabel", input.sourceLabel);
    defineOptional(reference, "publication", input.publication);
    defineOptional(reference, "publicationId", input.publicationId);
    defineOptional(reference, "pages", input.pages);

    return reference;
};

/**
 * @param {ThesisNormalizationInput} input
 * @returns {NormalizedThesisReference}
 */
export const normalizeThesisReference = (input) => {
    const reference = {
        id: input.id,
        type: "Thesis",
        rawType: input.rawType,
        title: input.title,
        url: input.url,
        institutionUrl: fallbackToReferenceUrl(input.institutionUrl, input.url),
        authors: input.authors ?? [],
        keywords: input.keywords ?? [],
    };

    defineOptional(reference, "description", input.description);
    defineOptional(reference, "datePublished", input.datePublished);
    defineOptional(reference, "publisherName", input.publisherName);
    defineOptional(reference, "publisherUrl", input.publisherUrl);
    defineOptional(reference, "sourceLabel", input.sourceLabel);
    defineOptional(reference, "institution", input.institution);
    defineOptional(reference, "institutionId", input.institutionId);

    return reference;
};

/**
 * @param {ReferenceNormalizationInput | { kind: string }} input
 * @returns {NormalizedReference}
 */
export const normalizeReference = (input) => {
    switch (input.kind) {
        case "Book":
            return normalizeBookReference(input);
        case "WebPage":
            return normalizeWebPageReference(input);
        case "VideoObject":
            return normalizeVideoReference(input);
        case "ScholarlyArticle":
            return normalizeScholarlyArticleReference(input);
        case "Thesis":
            return normalizeThesisReference(input);
        default:
            throw new Error(`Unsupported reference normalization kind: ${input.kind}`);
    }
};
