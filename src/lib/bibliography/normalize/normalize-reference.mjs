/**
 * @typedef {import("../types").NormalizedBookReference} NormalizedBookReference
 * @typedef {import("../types").NormalizedReference} NormalizedReference
 * @typedef {import("../types").AuthorRef} AuthorRef
 * @typedef {import("../types").PageReference} PageReference
 *
 * @typedef {object} BookNormalizationInput
 * @property {"Book"} kind
 * @property {string} id
 * @property {string} rawType
 * @property {string} title
 * @property {string=} description
 * @property {AuthorRef[]=} authors
 * @property {string=} datePublished
 * @property {string[]=} keywords
 * @property {string=} publisherName
 * @property {string=} publisherUrl
 * @property {string=} sourceLabel
 * @property {string} bookTitle
 * @property {string=} bookId
 * @property {PageReference=} pages
 */

const defineOptional = (target, key, value) => {
    if (value !== undefined) {
        target[key] = value;
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
 * @param {BookNormalizationInput | { kind: string }} input
 * @returns {NormalizedReference}
 */
export const normalizeReference = (input) => {
    if (input.kind === "Book") {
        return normalizeBookReference(input);
    }

    throw new Error(`Unsupported reference normalization kind: ${input.kind}`);
};
