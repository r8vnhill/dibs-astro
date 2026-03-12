import { describe, expect, it } from "vitest";
import { parseBibliography } from "../normalize-jsonld";

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
            pages: [69, 83],
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
            pages: [1, 22],
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
        });
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
