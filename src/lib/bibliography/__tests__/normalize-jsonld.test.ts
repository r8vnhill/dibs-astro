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
