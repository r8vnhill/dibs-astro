import { describe, expect, suite, test } from "vitest";

import type {
    BookNormalizationInput,
    ReferenceNormalizationInput,
    ScholarlyArticleNormalizationInput,
    ThesisNormalizationInput,
    VideoNormalizationInput,
} from "../normalize/normalize-reference-types";
import {
    normalizeBookReference,
    normalizeReference,
    normalizeScholarlyArticleReference,
    normalizeThesisReference,
    normalizeVideoReference,
} from "../normalize/normalize-reference.mjs";
import { parsePageReference } from "../pages";

const completePages = parsePageReference(10, 24);
if (!completePages) {
    throw new Error("Expected test page range to be valid.");
}

const completeBookInput = {
    kind: "Book",
    id: "ref:book",
    rawType: "Book",
    title: "Readable API chapters",
    description: "A focused chapter about readable API design.",
    authors: [{
        firstName: "Ada",
        lastName: "Lovelace",
    }],
    datePublished: "2024-01-15",
    keywords: ["api", "design"],
    publisherName: "Example Press",
    publisherUrl: "https://press.example/",
    sourceLabel: "normalizer test",
    bookTitle: "Readable Systems",
    bookId: "work:readable-systems",
    pages: completePages,
} satisfies BookNormalizationInput;

const completeVideoInput = {
    kind: "VideoObject",
    id: "ref:video",
    rawType: "VideoObject",
    title: "Designing APIs",
    url: "https://video.example/watch/designing-apis",
    description: "A conference talk about API design.",
    authors: [{
        firstName: "Grace",
        lastName: "Hopper",
    }],
    datePublished: "2024-02-20",
    keywords: ["video", "design"],
    publisherName: "Example Video",
    publisherUrl: "https://video.example/",
    sourceLabel: "normalizer test",
    platform: "Example Video",
    platformUrl: "https://video.example/",
} satisfies VideoNormalizationInput;

const completeArticleInput = {
    kind: "ScholarlyArticle",
    id: "ref:article",
    rawType: "ScholarlyArticle",
    title: "APIs in the Wild",
    url: "https://doi.example/10.1000/apis",
    description: "An article about API usage patterns.",
    authors: [{
        firstName: "Barbara",
        lastName: "Liskov",
    }],
    datePublished: "2024-03-10",
    keywords: ["article", "apis"],
    publisherName: "Example Publisher",
    publisherUrl: "https://publisher.example/",
    sourceLabel: "normalizer test",
    publication: "Journal of API Design",
    publicationId: "periodical:api-design",
    publicationUrl: "https://journal.example/",
    pages: completePages,
} satisfies ScholarlyArticleNormalizationInput;

const completeThesisInput = {
    kind: "Thesis",
    id: "ref:thesis",
    rawType: "Thesis",
    title: "API Documentation Practices",
    url: "https://repository.example/thesis",
    description: "A thesis about documentation quality.",
    authors: [{
        firstName: "Margaret",
        lastName: "Hamilton",
    }],
    datePublished: "2024-04-05",
    keywords: ["thesis", "documentation"],
    publisherName: "Example University",
    publisherUrl: "https://university.example/",
    sourceLabel: "normalizer test",
    institution: "Example University",
    institutionId: "org:university",
    institutionUrl: "https://university.example/",
} satisfies ThesisNormalizationInput;

const supportedDispatcherCases: readonly [string, ReferenceNormalizationInput, string][] = [
    ["Book", completeBookInput, "Book"],
    ["VideoObject", completeVideoInput, "VideoObject"],
    ["ScholarlyArticle", completeArticleInput, "ScholarlyArticle"],
    ["Thesis", completeThesisInput, "Thesis"],
];

const commonFieldCases = [
    {
        label: "Book",
        normalize: () => normalizeBookReference(completeBookInput),
        expected: {
            id: "ref:book",
            rawType: "Book",
            title: "Readable API chapters",
            description: "A focused chapter about readable API design.",
            authors: [{
                firstName: "Ada",
                lastName: "Lovelace",
            }],
            datePublished: "2024-01-15",
            keywords: ["api", "design"],
            publisherName: "Example Press",
            publisherUrl: "https://press.example/",
            sourceLabel: "normalizer test",
        },
    },
    {
        label: "VideoObject",
        normalize: () => normalizeVideoReference(completeVideoInput),
        expected: {
            id: "ref:video",
            rawType: "VideoObject",
            title: "Designing APIs",
            description: "A conference talk about API design.",
            authors: [{
                firstName: "Grace",
                lastName: "Hopper",
            }],
            datePublished: "2024-02-20",
            keywords: ["video", "design"],
            publisherName: "Example Video",
            publisherUrl: "https://video.example/",
            sourceLabel: "normalizer test",
        },
    },
    {
        label: "ScholarlyArticle",
        normalize: () => normalizeScholarlyArticleReference(completeArticleInput),
        expected: {
            id: "ref:article",
            rawType: "ScholarlyArticle",
            title: "APIs in the Wild",
            description: "An article about API usage patterns.",
            authors: [{
                firstName: "Barbara",
                lastName: "Liskov",
            }],
            datePublished: "2024-03-10",
            keywords: ["article", "apis"],
            publisherName: "Example Publisher",
            publisherUrl: "https://publisher.example/",
            sourceLabel: "normalizer test",
        },
    },
    {
        label: "Thesis",
        normalize: () => normalizeThesisReference(completeThesisInput),
        expected: {
            id: "ref:thesis",
            rawType: "Thesis",
            title: "API Documentation Practices",
            description: "A thesis about documentation quality.",
            authors: [{
                firstName: "Margaret",
                lastName: "Hamilton",
            }],
            datePublished: "2024-04-05",
            keywords: ["thesis", "documentation"],
            publisherName: "Example University",
            publisherUrl: "https://university.example/",
            sourceLabel: "normalizer test",
        },
    },
] as const;

suite("given Book normalization input", () => {
    describe("when normalizing through the shared Book normalizer", () => {
        test("then it returns the current NormalizedBookReference shape", () => {
            expect(normalizeBookReference(completeBookInput)).toEqual({
                id: "ref:book",
                type: "Book",
                rawType: "Book",
                title: "Readable API chapters",
                chapter: "Readable API chapters",
                bookTitle: "Readable Systems",
                bookId: "work:readable-systems",
                pages: {
                    start: 10,
                    end: 24,
                },
                description: "A focused chapter about readable API design.",
                authors: [{
                    firstName: "Ada",
                    lastName: "Lovelace",
                }],
                datePublished: "2024-01-15",
                keywords: ["api", "design"],
                publisherName: "Example Press",
                publisherUrl: "https://press.example/",
                sourceLabel: "normalizer test",
            });
        });

        test("then the generic dispatcher supports Book input", () => {
            expect(normalizeReference(completeBookInput)).toEqual(
                normalizeBookReference(completeBookInput),
            );
        });
    });

    describe("when optional Book metadata is present", () => {
        test("then catalog book IDs and page ranges are preserved", () => {
            const reference = normalizeBookReference(completeBookInput);

            expect(reference).toMatchObject({
                bookId: "work:readable-systems",
                pages: {
                    start: 10,
                    end: 24,
                },
            });
        });

        test("then chapter is derived from title", () => {
            const reference = normalizeBookReference(completeBookInput);

            expect(reference.chapter).toBe(reference.title);
        });
    });

    describe("when optional Book metadata is missing", () => {
        test("then optional fields are omitted without changing required arrays", () => {
            const reference = normalizeBookReference({
                kind: "Book",
                id: "ref:minimal-book",
                rawType: "Book",
                title: "Minimal Chapter",
                bookTitle: "Minimal Book",
            });

            expect(reference).toEqual({
                id: "ref:minimal-book",
                type: "Book",
                rawType: "Book",
                title: "Minimal Chapter",
                chapter: "Minimal Chapter",
                bookTitle: "Minimal Book",
                authors: [],
                keywords: [],
            });
            expect(reference).not.toHaveProperty("description");
            expect(reference).not.toHaveProperty("bookId");
            expect(reference).not.toHaveProperty("pages");
            expect(reference).not.toHaveProperty("publisherName");
            expect(reference).not.toHaveProperty("publisherUrl");
        });
    });

    describe("when an unsupported kind reaches the generic dispatcher", () => {
        test("then it fails with a stable message", () => {
            expect(() =>
                normalizeReference({
                    kind: "WebPage",
                    id: "ref:web",
                    rawType: "WebPage",
                    title: "Unsupported",
                } as never)
            ).toThrow("Unsupported reference normalization kind: WebPage");
        });
    });
});

suite("given remaining shared normalization inputs", () => {
    describe("when normalizing through the shared type-specific normalizers", () => {
        test("then VideoObject preserves the current render-facing shape", () => {
            expect(normalizeVideoReference(completeVideoInput)).toEqual({
                id: "ref:video",
                type: "VideoObject",
                rawType: "VideoObject",
                title: "Designing APIs",
                url: "https://video.example/watch/designing-apis",
                platform: "Example Video",
                platformUrl: "https://video.example/",
                description: "A conference talk about API design.",
                authors: [{
                    firstName: "Grace",
                    lastName: "Hopper",
                }],
                datePublished: "2024-02-20",
                keywords: ["video", "design"],
                publisherName: "Example Video",
                publisherUrl: "https://video.example/",
                sourceLabel: "normalizer test",
            });
        });

        test("then ScholarlyArticle preserves publication metadata and page ranges", () => {
            expect(normalizeScholarlyArticleReference(completeArticleInput)).toEqual({
                id: "ref:article",
                type: "ScholarlyArticle",
                rawType: "ScholarlyArticle",
                title: "APIs in the Wild",
                url: "https://doi.example/10.1000/apis",
                publication: "Journal of API Design",
                publicationId: "periodical:api-design",
                publicationUrl: "https://journal.example/",
                pages: {
                    start: 10,
                    end: 24,
                },
                description: "An article about API usage patterns.",
                authors: [{
                    firstName: "Barbara",
                    lastName: "Liskov",
                }],
                datePublished: "2024-03-10",
                keywords: ["article", "apis"],
                publisherName: "Example Publisher",
                publisherUrl: "https://publisher.example/",
                sourceLabel: "normalizer test",
            });
        });

        test("then Thesis preserves institution metadata", () => {
            expect(normalizeThesisReference(completeThesisInput)).toEqual({
                id: "ref:thesis",
                type: "Thesis",
                rawType: "Thesis",
                title: "API Documentation Practices",
                url: "https://repository.example/thesis",
                institution: "Example University",
                institutionId: "org:university",
                institutionUrl: "https://university.example/",
                description: "A thesis about documentation quality.",
                authors: [{
                    firstName: "Margaret",
                    lastName: "Hamilton",
                }],
                datePublished: "2024-04-05",
                keywords: ["thesis", "documentation"],
                publisherName: "Example University",
                publisherUrl: "https://university.example/",
                sourceLabel: "normalizer test",
            });
        });
    });

    describe("when normalizing shared reference metadata with fallbacks", () => {
        test("then VideoObject falls back to the hostname and reference URL", () => {
            expect(normalizeVideoReference({
                kind: "VideoObject",
                id: "ref:video-fallback",
                rawType: "VideoObject",
                title: "No Publisher Video",
                url: "https://videos.example/watch/no-publisher",
            })).toEqual({
                id: "ref:video-fallback",
                type: "VideoObject",
                rawType: "VideoObject",
                title: "No Publisher Video",
                url: "https://videos.example/watch/no-publisher",
                platform: "videos.example",
                platformUrl: "https://videos.example/watch/no-publisher",
                authors: [],
                keywords: [],
            });
        });

        test("then ScholarlyArticle falls back to the article URL when publicationUrl is absent", () => {
            expect(normalizeScholarlyArticleReference({
                kind: "ScholarlyArticle",
                id: "ref:article-fallback",
                rawType: "ScholarlyArticle",
                title: "Fallback Article",
                url: "https://doi.example/fallback",
                publication: "Journal",
            })).toEqual({
                id: "ref:article-fallback",
                type: "ScholarlyArticle",
                rawType: "ScholarlyArticle",
                title: "Fallback Article",
                url: "https://doi.example/fallback",
                publication: "Journal",
                publicationUrl: "https://doi.example/fallback",
                authors: [],
                keywords: [],
            });
        });

        test("then Thesis falls back to the thesis URL when institutionUrl is absent", () => {
            expect(normalizeThesisReference({
                kind: "Thesis",
                id: "ref:thesis-fallback",
                rawType: "Thesis",
                title: "Fallback Thesis",
                url: "https://repository.example/fallback",
                institution: "Example University",
            })).toEqual({
                id: "ref:thesis-fallback",
                type: "Thesis",
                rawType: "Thesis",
                title: "Fallback Thesis",
                url: "https://repository.example/fallback",
                institution: "Example University",
                institutionUrl: "https://repository.example/fallback",
                authors: [],
                keywords: [],
            });
        });
    });

    describe("when comparing the supported shared normalizers", () => {
        test.each(commonFieldCases)(
            "then %s preserves the common reference metadata",
            ({ normalize, expected }) => {
                expect(normalize()).toMatchObject(expected);
            },
        );

        test.each(supportedDispatcherCases)(
            "then the dispatcher returns %s as %s",
            (_label, input, expectedType) => {
                expect(normalizeReference(input).type).toBe(expectedType);
            },
        );
    });
});
