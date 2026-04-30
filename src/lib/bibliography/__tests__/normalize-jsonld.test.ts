import { describe, expect, it } from "vitest";
import {
    normalizeScholarlyArticleReference,
    normalizeWebPageReference,
} from "../normalize/normalize-reference.mjs";
import { extractFallbackTitles, parseBibliography } from "../normalize-jsonld";
import { parsePageReference } from "../pages";

const articlePages = parsePageReference(1, 22);
if (!articlePages) {
    throw new Error("Expected article test page range to be valid.");
}

describe("parseBibliography", () => {
    it("parses a valid Book reference with authors and pages", () => {
        const parsed = parseBibliography({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: [
                {
                    "@type": "Book",
                    identifier: "book-1",
                    name: "The pipeline: Connecting commands",
                    pageStart: 69,
                    pageEnd: 83,
                    author: [
                        {
                            "@type": "Person",
                            givenName: "Travis",
                            familyName: "Plunk",
                        },
                    ],
                    isPartOf: {
                        "@type": "Book",
                        name: "Learn PowerShell in a month of lunches",
                    },
                },
            ],
        });

        expect(parsed.items).toHaveLength(1);
        expect(parsed.items[0]).toMatchObject({
            id: "book-1",
            type: "Book",
            chapter: "The pipeline: Connecting commands",
            bookTitle: "Learn PowerShell in a month of lunches",
            pages: { start: 69, end: 83 },
        });
    });

    it("parses a valid WebPage with url", () => {
        const parsed = parseBibliography({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: [
                {
                    "@type": "WebPage",
                    identifier: "web-1",
                    name: "Collection Pipeline",
                    url: "https://martinfowler.com/articles/collection-pipeline/",
                },
            ],
        });

        expect(parsed.items).toHaveLength(1);
        expect(parsed.items[0]).toMatchObject({
            id: "web-1",
            type: "WebPage",
            url: "https://martinfowler.com/articles/collection-pipeline/",
        });
    });

    it("parses a valid ScholarlyArticle with publication and pages", () => {
        const parsed = parseBibliography({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: [
                {
                    "@type": "ScholarlyArticle",
                    identifier: "article-1",
                    name: "Bash in the Wild: Language Usage, Code Smells, and Bugs",
                    url: "https://doi.org/10.1145/3517193",
                    pageStart: 1,
                    pageEnd: 22,
                    isPartOf: {
                        "@type": "Periodical",
                        name: "ACM Transactions on Software Engineering and Methodology",
                        url: "https://dl.acm.org/journal/tosem",
                    },
                },
            ],
        });

        expect(parsed.items).toHaveLength(1);
        expect(parsed.items[0]).toMatchObject({
            id: "article-1",
            type: "ScholarlyArticle",
            url: "https://doi.org/10.1145/3517193",
            publication: "ACM Transactions on Software Engineering and Methodology",
            publicationUrl: "https://dl.acm.org/journal/tosem",
            pages: { start: 1, end: 22 },
        });
    });

    it("parses a valid VideoObject with platform metadata", () => {
        const parsed = parseBibliography({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: [
                {
                    "@type": "VideoObject",
                    identifier: "video-1",
                    name: "Nushell: A new type of shell!",
                    url: "https://www.youtube.com/watch?v=GPqV6rLfKR4",
                    datePublished: "2024-11-29",
                    publisher: {
                        "@type": "Organization",
                        name: "Dispatch",
                        url: "https://www.youtube.com/",
                    },
                },
            ],
        });

        expect(parsed.items).toHaveLength(1);
        expect(parsed.items[0]).toMatchObject({
            id: "video-1",
            type: "VideoObject",
            url: "https://www.youtube.com/watch?v=GPqV6rLfKR4",
            platform: "Dispatch",
            platformUrl: "https://www.youtube.com/",
            datePublished: "2024-11-29",
        });
    });

    it("parses a valid Thesis with institution", () => {
        const parsed = parseBibliography({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: [
                {
                    "@type": "Thesis",
                    identifier: "thesis-1",
                    name: "An Empirical Study on Bash Language Usage in Github",
                    url: "http://hdl.handle.net/10012/17036",
                    publisher: {
                        "@type": "CollegeOrUniversity",
                        name: "University of Waterloo",
                        url: "https://uwaterloo.ca/",
                    },
                },
            ],
        });

        expect(parsed.items).toHaveLength(1);
        expect(parsed.items[0]).toMatchObject({
            id: "thesis-1",
            type: "Thesis",
            url: "http://hdl.handle.net/10012/17036",
            institution: "University of Waterloo",
            institutionUrl: "https://uwaterloo.ca/",
        });
    });

    it("falls back to the reference url when metadata-specific url is missing", () => {
        const parsed = parseBibliography({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: [
                {
                    "@type": "WebPage",
                    identifier: "web-1",
                    name: "Pipelines",
                    url: "https://www.nushell.sh/book/pipelines.html",
                    publisher: {
                        "@type": "Organization",
                        name: "Nushell",
                    },
                },
            ],
        });

        expect(parsed.items[0]).toMatchObject({
            id: "web-1",
            type: "WebPage",
            location: "Nushell",
            locationUrl: "https://www.nushell.sh/book/pipelines.html",
        });
    });

    it("matches the shared ScholarlyArticle normalizer for the rendered output", () => {
        const source = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: [
                {
                    "@type": "ScholarlyArticle",
                    identifier: "article-1",
                    name: "Bash in the Wild: Language Usage, Code Smells, and Bugs",
                    url: "https://doi.org/10.1145/3517193",
                    description: "A longitudinal analysis of Bash code quality.",
                    pageStart: 1,
                    pageEnd: 22,
                    author: [{
                        "@type": "Person",
                        givenName: "Jane",
                        familyName: "Doe",
                    }],
                    keywords: ["bash", "quality"],
                    publisher: {
                        "@type": "Organization",
                        name: "ACM",
                        url: "https://dl.acm.org/",
                    },
                    isPartOf: {
                        "@type": "Periodical",
                        name: "ACM Transactions on Software Engineering and Methodology",
                        url: "https://dl.acm.org/journal/tosem",
                    },
                },
            ],
        };

        const parsed = parseBibliography(source, { sourceLabel: "jsonld test" });

        expect(parsed.items[0]).toEqual(normalizeScholarlyArticleReference({
            kind: "ScholarlyArticle",
            id: "article-1",
            rawType: "ScholarlyArticle",
            title: "Bash in the Wild: Language Usage, Code Smells, and Bugs",
            url: "https://doi.org/10.1145/3517193",
            description: "A longitudinal analysis of Bash code quality.",
            authors: [{
                firstName: "Jane",
                lastName: "Doe",
            }],
            keywords: ["bash", "quality"],
            publisherName: "ACM",
            publisherUrl: "https://dl.acm.org/",
            sourceLabel: "jsonld test",
            publication: "ACM Transactions on Software Engineering and Methodology",
            publicationUrl: "https://dl.acm.org/journal/tosem",
            pages: articlePages,
        }));
    });

    it("preserves WebPage publisher and location fallback behavior after delegation", () => {
        const parsed = parseBibliography({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: [
                {
                    "@type": "WebPage",
                    identifier: "web-2",
                    name: "Collection Pipeline",
                    url: "https://martinfowler.com/articles/collection-pipeline/",
                },
            ],
        }, { sourceLabel: "jsonld test" });

        expect(parsed.items[0]).toEqual(normalizeWebPageReference({
            kind: "WebPage",
            id: "web-2",
            rawType: "WebPage",
            title: "Collection Pipeline",
            url: "https://martinfowler.com/articles/collection-pipeline/",
            authors: [],
            keywords: [],
            sourceLabel: "jsonld test",
        }));
    });

    it("preserves the normalized output shape for mixed supported ItemList references", () => {
        const parsed = parseBibliography({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: [
                {
                    "@type": "Book",
                    identifier: "book-1",
                    name: "The pipeline: Connecting commands",
                    pageStart: 69,
                    pageEnd: 83,
                    isPartOf: {
                        "@type": "Book",
                        name: "Learn PowerShell in a month of lunches",
                    },
                },
                {
                    "@type": "WebPage",
                    identifier: "web-1",
                    name: "Collection Pipeline",
                    url: "https://martinfowler.com/articles/collection-pipeline/",
                },
                {
                    "@type": "VideoObject",
                    identifier: "video-1",
                    name: "Nushell: A new type of shell!",
                    url: "https://www.youtube.com/watch?v=GPqV6rLfKR4",
                    publisher: {
                        "@type": "Organization",
                        name: "Dispatch",
                        url: "https://www.youtube.com/",
                    },
                },
                {
                    "@type": "ScholarlyArticle",
                    identifier: "article-1",
                    name: "Bash in the Wild",
                    url: "https://doi.org/10.1145/3517193",
                    isPartOf: {
                        "@type": "Periodical",
                        name: "ACM TOSEM",
                        url: "https://dl.acm.org/journal/tosem",
                    },
                    pageStart: 1,
                    pageEnd: 22,
                },
                {
                    "@type": "Thesis",
                    identifier: "thesis-1",
                    name: "An Empirical Study on Bash Language Usage in Github",
                    url: "http://hdl.handle.net/10012/17036",
                    publisher: {
                        "@type": "CollegeOrUniversity",
                        name: "University of Waterloo",
                        url: "https://uwaterloo.ca/",
                    },
                },
            ],
        });

        expect(parsed.items.map(({ id, type }) => ({ id, type }))).toEqual([
            { id: "book-1", type: "Book" },
            { id: "web-1", type: "WebPage" },
            { id: "video-1", type: "VideoObject" },
            { id: "article-1", type: "ScholarlyArticle" },
            { id: "thesis-1", type: "Thesis" },
        ]);
    });

    it("throws when an item is missing identifier", () => {
        expect(() =>
            parseBibliography({
                "@context": "https://schema.org",
                "@type": "ItemList",
                itemListElement: [
                    {
                        "@type": "WebPage",
                        name: "Collection Pipeline",
                        url: "https://martinfowler.com/articles/collection-pipeline/",
                    },
                ],
            })
        ).toThrow(/missing "identifier"/i);
    });

    it("throws when identifier is duplicated", () => {
        expect(() =>
            parseBibliography({
                "@context": "https://schema.org",
                "@type": "ItemList",
                itemListElement: [
                    {
                        "@type": "WebPage",
                        identifier: "dup-id",
                        name: "A",
                        url: "https://example.com/a",
                    },
                    {
                        "@type": "WebPage",
                        identifier: "dup-id",
                        name: "B",
                        url: "https://example.com/b",
                    },
                ],
            })
        ).toThrow(/duplicate identifier/i);
    });

    it("throws when @type is not supported in v1", () => {
        expect(() =>
            parseBibliography({
                "@context": "https://schema.org",
                "@type": "ItemList",
                itemListElement: [
                    {
                        "@type": "BlogPosting",
                        identifier: "blog-1",
                        name: "Unsupported",
                    },
                ],
            })
        ).toThrow(/unsupported @type/i);
    });
});

describe("extractFallbackTitles", () => {
    it("extracts name as fallback title when present", () => {
        const titles = extractFallbackTitles({
            itemListElement: [
                {
                    identifier: "ref-1",
                    name: "Reference Title",
                },
            ],
        });

        expect(titles).toEqual({ "ref-1": "Reference Title" });
    });

    it("uses headline as fallback when name is missing", () => {
        const titles = extractFallbackTitles({
            itemListElement: [
                {
                    identifier: "ref-1",
                    headline: "Alternative Title",
                },
            ],
        });

        expect(titles).toEqual({ "ref-1": "Alternative Title" });
    });

    it("prefers name over headline", () => {
        const titles = extractFallbackTitles({
            itemListElement: [
                {
                    identifier: "ref-1",
                    name: "Preferred Title",
                    headline: "Alternative Title",
                },
            ],
        });

        expect(titles).toEqual({ "ref-1": "Preferred Title" });
    });

    it("skips items without identifier", () => {
        const titles = extractFallbackTitles({
            itemListElement: [
                {
                    name: "Orphan Title",
                },
            ],
        });

        expect(titles).toEqual({});
    });

    it("skips items with empty or whitespace-only titles", () => {
        const titles = extractFallbackTitles({
            itemListElement: [
                {
                    identifier: "ref-1",
                    name: "   ",
                    headline: "",
                },
                {
                    identifier: "ref-2",
                    name: "",
                },
            ],
        });

        expect(titles).toEqual({});
    });

    it("skips non-object items in itemListElement", () => {
        const titles = extractFallbackTitles({
            itemListElement: [
                "string-item",
                123,
                null,
                {
                    identifier: "ref-1",
                    name: "Valid Title",
                },
            ],
        });

        expect(titles).toEqual({ "ref-1": "Valid Title" });
    });

    it("returns empty object when source is not an object", () => {
        expect(extractFallbackTitles(null)).toEqual({});
        expect(extractFallbackTitles(undefined)).toEqual({});
        expect(extractFallbackTitles("string")).toEqual({});
        expect(extractFallbackTitles(123)).toEqual({});
    });

    it("returns empty object when itemListElement is missing or not an array", () => {
        expect(extractFallbackTitles({})).toEqual({});
        expect(extractFallbackTitles({ itemListElement: null })).toEqual({});
        expect(extractFallbackTitles({ itemListElement: "not-array" })).toEqual({});
    });

    it("handles multiple references with mixed valid and invalid entries", () => {
        const titles = extractFallbackTitles({
            itemListElement: [
                {
                    identifier: "ref-1",
                    name: "First Reference",
                },
                {
                    // missing identifier
                    name: "Orphaned",
                },
                {
                    identifier: "ref-2",
                    headline: "Second Reference",
                },
                null,
                {
                    identifier: "ref-3",
                    name: "",
                    headline: "   ",
                },
            ],
        });

        expect(titles).toEqual({
            "ref-1": "First Reference",
            "ref-2": "Second Reference",
        });
    });
});
