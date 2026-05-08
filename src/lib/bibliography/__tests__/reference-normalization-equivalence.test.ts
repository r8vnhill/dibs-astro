import { describe, expect, suite, test } from "vitest";

import { loadBibliographyCatalog } from "../catalog";
import { parseBibliography } from "../normalize-jsonld";
import type { NormalizedReference } from "../types";

type ComparableReference = Record<string, unknown>;

type EquivalentReferenceCase = {
    readonly label: string;
    readonly itemListSource: Record<string, unknown>;
    readonly catalogSource: Record<string, unknown>;
    readonly referenceId: string;
};

const itemList = (item: Record<string, unknown>) => ({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [item],
});

const catalog = (...nodes: Record<string, unknown>[]) => ({
    "@context": "https://schema.org",
    "@graph": nodes,
});

const parseSingleItemListReference = (
    source: Record<string, unknown>,
): NormalizedReference => {
    const parsed = parseBibliography(source, { sourceLabel: "ItemList fixture" });

    expect(parsed.items).toHaveLength(1);

    return parsed.items[0] as NormalizedReference;
};

const parseSingleCatalogReference = (
    source: Record<string, unknown>,
    referenceId: string,
): NormalizedReference => {
    const parsed = loadBibliographyCatalog(source, { sourceLabel: "catalog fixture" });
    const reference = parsed.referencesById.get(referenceId);

    expect(reference).toBeDefined();

    return reference as NormalizedReference;
};

const projectBaseFields = (reference: NormalizedReference): ComparableReference => ({
    id: reference.id,
    type: reference.type,
    rawType: reference.rawType,
    title: reference.title,
    ...(reference.description ? { description: reference.description } : {}),
    authors: reference.authors,
    ...(reference.datePublished ? { datePublished: reference.datePublished } : {}),
    keywords: reference.keywords,
    ...(reference.publisherName ? { publisherName: reference.publisherName } : {}),
    ...(reference.publisherUrl ? { publisherUrl: reference.publisherUrl } : {}),
});

const projectComparableReference = (
    reference: NormalizedReference,
): ComparableReference => {
    const base = projectBaseFields(reference);

    switch (reference.type) {
        case "Book":
            return {
                ...base,
                chapter: reference.chapter,
                bookTitle: reference.bookTitle,
                ...(reference.pages ? { pages: reference.pages } : {}),
            };
        case "WebPage":
            return {
                ...base,
                url: reference.url,
                ...(reference.location ? { location: reference.location } : {}),
                ...(reference.locationUrl ? { locationUrl: reference.locationUrl } : {}),
            };
        case "VideoObject":
            return {
                ...base,
                url: reference.url,
                ...(reference.platform ? { platform: reference.platform } : {}),
                ...(reference.platformUrl ? { platformUrl: reference.platformUrl } : {}),
            };
        case "ScholarlyArticle":
            return {
                ...base,
                url: reference.url,
                ...(reference.publication ? { publication: reference.publication } : {}),
                ...(reference.publicationUrl
                    ? { publicationUrl: reference.publicationUrl }
                    : {}),
                ...(reference.pages ? { pages: reference.pages } : {}),
            };
        case "Thesis":
            return {
                ...base,
                url: reference.url,
                ...(reference.institution ? { institution: reference.institution } : {}),
                ...(reference.institutionUrl ? { institutionUrl: reference.institutionUrl } : {}),
            };
    }
};

const equivalentReferenceCases: readonly EquivalentReferenceCase[] = [
    {
        label: "Book",
        referenceId: "ref:book",
        itemListSource: itemList({
            identifier: "ref:book",
            "@type": "Book",
            name: "Chapter One",
            description: "A chapter about readable APIs.",
            author: [{
                "@type": "Person",
                givenName: "Ada",
                familyName: "Lovelace",
            }],
            datePublished: "2024-01-15",
            keywords: ["api", "design"],
            publisher: {
                "@type": "Organization",
                name: "Example Press",
                url: "https://press.example/",
            },
            isPartOf: {
                "@type": "Book",
                name: "Readable Systems",
            },
            pageStart: "30",
            pageEnd: "42",
        }),
        catalogSource: catalog(
            {
                "@id": "work:readable-systems",
                "@type": "CreativeWork",
                name: "Readable Systems",
            },
            {
                "@id": "ref:book",
                "@type": "Book",
                name: "Chapter One",
                description: "A chapter about readable APIs.",
                author: [{
                    "@type": "Person",
                    givenName: "Ada",
                    familyName: "Lovelace",
                }],
                datePublished: "2024-01-15",
                keywords: ["api", "design"],
                publisher: {
                    "@type": "Organization",
                    name: "Example Press",
                    url: "https://press.example/",
                },
                isPartOf: { "@id": "work:readable-systems" },
                pageStart: "30",
                pageEnd: "42",
            },
        ),
    },
    {
        label: "WebPage",
        referenceId: "ref:web",
        itemListSource: itemList({
            identifier: "ref:web",
            "@type": "WebPage",
            name: "API Guidelines",
            url: "https://docs.example/guidelines",
            isPartOf: {
                "@type": "WebSite",
                name: "Example Docs",
                url: "https://docs.example/",
            },
            publisher: {
                "@type": "Organization",
                name: "Example Docs",
                url: "https://docs.example/",
            },
        }),
        catalogSource: catalog({
            "@id": "ref:web",
            "@type": "WebPage",
            name: "API Guidelines",
            url: "https://docs.example/guidelines",
            isPartOf: { "@id": "site:example-docs" },
            publisher: {
                "@type": "Organization",
                name: "Example Docs",
                url: "https://docs.example/",
            },
        }),
    },
    {
        label: "WebPage hosted on site",
        referenceId: "ref:web-site",
        itemListSource: itemList({
            identifier: "ref:web-site",
            "@type": "WebPage",
            name: "Kotlin custom scripting",
            url: "https://kotlinlang.org/docs/custom-script-deps-tutorial.html",
            isPartOf: {
                "@type": "WebSite",
                name: "Kotlin docs",
                url: "https://kotlinlang.org/docs/",
            },
            publisher: {
                "@type": "Organization",
                name: "JetBrains",
                url: "https://www.jetbrains.com/",
            },
        }),
        catalogSource: catalog(
            {
                "@id": "site:kotlin-docs",
                "@type": "WebSite",
                name: "Kotlin docs",
                url: "https://kotlinlang.org/docs/",
            },
            {
                "@id": "ref:web-site",
                "@type": "WebPage",
                name: "Kotlin custom scripting",
                url: "https://kotlinlang.org/docs/custom-script-deps-tutorial.html",
                isPartOf: { "@id": "site:kotlin-docs" },
                publisher: {
                    "@type": "Organization",
                    name: "JetBrains",
                    url: "https://www.jetbrains.com/",
                },
            },
        ),
    },
    {
        label: "VideoObject",
        referenceId: "ref:video",
        itemListSource: itemList({
            identifier: "ref:video",
            "@type": "VideoObject",
            name: "Designing APIs",
            url: "https://video.example/watch/designing-apis",
            datePublished: "2024-02-20",
            publisher: {
                "@type": "Organization",
                name: "Example Video",
                url: "https://video.example/",
            },
        }),
        catalogSource: catalog({
            "@id": "ref:video",
            "@type": "VideoObject",
            name: "Designing APIs",
            url: "https://video.example/watch/designing-apis",
            datePublished: "2024-02-20",
            publisher: {
                "@type": "Organization",
                name: "Example Video",
                url: "https://video.example/",
            },
        }),
    },
    {
        label: "ScholarlyArticle",
        referenceId: "ref:article",
        itemListSource: itemList({
            identifier: "ref:article",
            "@type": "ScholarlyArticle",
            name: "APIs in the Wild",
            url: "https://doi.example/10.1000/apis",
            publisher: {
                "@type": "Organization",
                name: "Example Publisher",
                url: "https://publisher.example/",
            },
            isPartOf: {
                "@type": "Periodical",
                name: "Journal of API Design",
                url: "https://journal.example/",
            },
            pageStart: 10,
            pageEnd: 25,
        }),
        catalogSource: catalog(
            {
                "@id": "periodical:api-design",
                "@type": "Periodical",
                name: "Journal of API Design",
                url: "https://journal.example/",
            },
            {
                "@id": "ref:article",
                "@type": "ScholarlyArticle",
                name: "APIs in the Wild",
                url: "https://doi.example/10.1000/apis",
                publisher: {
                    "@type": "Organization",
                    name: "Example Publisher",
                    url: "https://publisher.example/",
                },
                isPartOf: { "@id": "periodical:api-design" },
                pageStart: 10,
                pageEnd: 25,
            },
        ),
    },
    {
        label: "Thesis",
        referenceId: "ref:thesis",
        itemListSource: itemList({
            identifier: "ref:thesis",
            "@type": "Thesis",
            name: "API Documentation Practices",
            url: "https://repository.example/thesis",
            publisher: {
                "@type": "CollegeOrUniversity",
                name: "Example University",
                url: "https://university.example/",
            },
        }),
        catalogSource: catalog({
            "@id": "ref:thesis",
            "@type": "Thesis",
            name: "API Documentation Practices",
            url: "https://repository.example/thesis",
            publisher: {
                "@type": "CollegeOrUniversity",
                name: "Example University",
                url: "https://university.example/",
            },
        }),
    },
];

suite("given equivalent catalog and ItemList reference sources", () => {
    describe("when parsing primary rendered reference types", () => {
        test.each(equivalentReferenceCases)(
            "then %s produces equivalent render-facing fields",
            ({ itemListSource, catalogSource, referenceId }) => {
                const itemListReference = parseSingleItemListReference(itemListSource);
                const catalogReference = parseSingleCatalogReference(catalogSource, referenceId);

                expect(projectComparableReference(catalogReference)).toEqual(
                    projectComparableReference(itemListReference),
                );
            },
        );
    });

    describe("when applying fallback-sensitive normalization", () => {
        test("then name wins over headline", () => {
            const itemListReference = parseSingleItemListReference(
                itemList({
                    identifier: "ref:web",
                    "@type": "WebPage",
                    name: "Preferred Name",
                    headline: "Secondary Headline",
                    url: "https://example.com/preferred",
                }),
            );
            const catalogReference = parseSingleCatalogReference(
                catalog({
                    "@id": "ref:web",
                    "@type": "WebPage",
                    name: "Preferred Name",
                    headline: "Secondary Headline",
                    url: "https://example.com/preferred",
                }),
                "ref:web",
            );

            expect(projectComparableReference(catalogReference)).toEqual(
                projectComparableReference(itemListReference),
            );
            expect(catalogReference.title).toBe("Preferred Name");
        });

        test("then blank names fall back to headlines", () => {
            const itemListReference = parseSingleItemListReference(
                itemList({
                    identifier: "ref:web",
                    "@type": "WebPage",
                    name: " ",
                    headline: "Headline Fallback",
                    url: "https://example.com/headline",
                }),
            );
            const catalogReference = parseSingleCatalogReference(
                catalog({
                    "@id": "ref:web",
                    "@type": "WebPage",
                    name: " ",
                    headline: "Headline Fallback",
                    url: "https://example.com/headline",
                }),
                "ref:web",
            );

            expect(projectComparableReference(catalogReference)).toEqual(
                projectComparableReference(itemListReference),
            );
            expect(catalogReference.title).toBe("Headline Fallback");
        });

        test("then URL-derived hostname fallback is consistent without publisher metadata", () => {
            const itemListReference = parseSingleItemListReference(
                itemList({
                    identifier: "ref:video",
                    "@type": "VideoObject",
                    name: "No Publisher Video",
                    url: "https://videos.example/watch/no-publisher",
                }),
            );
            const catalogReference = parseSingleCatalogReference(
                catalog({
                    "@id": "ref:video",
                    "@type": "VideoObject",
                    name: "No Publisher Video",
                    url: "https://videos.example/watch/no-publisher",
                }),
                "ref:video",
            );

            expect(projectComparableReference(catalogReference)).toEqual(
                projectComparableReference(itemListReference),
            );
            expect(catalogReference).toMatchObject({
                platform: "videos.example",
                platformUrl: "https://videos.example/watch/no-publisher",
            });
        });

        test("then metadata URLs fall back to the reference URL when absent", () => {
            const itemListReference = parseSingleItemListReference(
                itemList({
                    identifier: "ref:web",
                    "@type": "WebPage",
                    name: "Publisher Without URL",
                    url: "https://docs.example/page",
                    publisher: {
                        "@type": "Organization",
                        name: "Docs Team",
                    },
                }),
            );
            const catalogReference = parseSingleCatalogReference(
                catalog({
                    "@id": "ref:web",
                    "@type": "WebPage",
                    name: "Publisher Without URL",
                    url: "https://docs.example/page",
                    publisher: {
                        "@type": "Organization",
                        name: "Docs Team",
                    },
                }),
                "ref:web",
            );

            expect(projectComparableReference(catalogReference)).toEqual(
                projectComparableReference(itemListReference),
            );
            expect(catalogReference).toMatchObject({
                location: "Docs Team",
                locationUrl: "https://docs.example/page",
            });
        });

        test("then reversed page ranges normalize consistently", () => {
            const itemListReference = parseSingleItemListReference(
                itemList({
                    identifier: "ref:article",
                    "@type": "ScholarlyArticle",
                    name: "Reversed Pages",
                    url: "https://doi.example/reversed",
                    isPartOf: {
                        "@type": "Periodical",
                        name: "Journal",
                    },
                    pageStart: 25,
                    pageEnd: 10,
                }),
            );
            const catalogReference = parseSingleCatalogReference(
                catalog(
                    {
                        "@id": "periodical:journal",
                        "@type": "Periodical",
                        name: "Journal",
                    },
                    {
                        "@id": "ref:article",
                        "@type": "ScholarlyArticle",
                        name: "Reversed Pages",
                        url: "https://doi.example/reversed",
                        isPartOf: { "@id": "periodical:journal" },
                        pageStart: 25,
                        pageEnd: 10,
                    },
                ),
                "ref:article",
            );

            expect(projectComparableReference(catalogReference)).toEqual(
                projectComparableReference(itemListReference),
            );
            expect(catalogReference).toMatchObject({
                pages: { start: 10, end: 25 },
            });
        });
    });

    describe("when catalog-only metadata is available", () => {
        test("then catalog IDs are preserved without requiring ItemList equivalence", () => {
            const catalogReference = parseSingleCatalogReference(
                catalog(
                    {
                        "@id": "work:book",
                        "@type": "CreativeWork",
                        name: "Catalog Book",
                    },
                    {
                        "@id": "periodical:journal",
                        "@type": "Periodical",
                        name: "Catalog Journal",
                    },
                    {
                        "@id": "org:university",
                        "@type": "CollegeOrUniversity",
                        name: "Catalog University",
                    },
                    {
                        "@id": "ref:book",
                        "@type": "Book",
                        name: "Catalog Chapter",
                        isPartOf: { "@id": "work:book" },
                    },
                    {
                        "@id": "ref:article",
                        "@type": "ScholarlyArticle",
                        name: "Catalog Article",
                        url: "https://doi.example/catalog",
                        isPartOf: { "@id": "periodical:journal" },
                    },
                    {
                        "@id": "ref:thesis",
                        "@type": "Thesis",
                        name: "Catalog Thesis",
                        url: "https://repository.example/catalog",
                        publisher: { "@id": "org:university" },
                    },
                ),
                "ref:book",
            );
            const parsedCatalog = loadBibliographyCatalog({
                "@context": "https://schema.org",
                "@graph": [
                    {
                        "@id": "work:book",
                        "@type": "CreativeWork",
                        name: "Catalog Book",
                    },
                    {
                        "@id": "periodical:journal",
                        "@type": "Periodical",
                        name: "Catalog Journal",
                    },
                    {
                        "@id": "org:university",
                        "@type": "CollegeOrUniversity",
                        name: "Catalog University",
                    },
                    {
                        "@id": "ref:book",
                        "@type": "Book",
                        name: "Catalog Chapter",
                        isPartOf: { "@id": "work:book" },
                    },
                    {
                        "@id": "ref:article",
                        "@type": "ScholarlyArticle",
                        name: "Catalog Article",
                        url: "https://doi.example/catalog",
                        isPartOf: { "@id": "periodical:journal" },
                    },
                    {
                        "@id": "ref:thesis",
                        "@type": "Thesis",
                        name: "Catalog Thesis",
                        url: "https://repository.example/catalog",
                        publisher: { "@id": "org:university" },
                    },
                ],
            });

            expect(catalogReference).toMatchObject({ bookId: "work:book" });
            expect(parsedCatalog.referencesById.get("ref:article")).toMatchObject({
                publicationId: "periodical:journal",
            });
            expect(parsedCatalog.referencesById.get("ref:thesis")).toMatchObject({
                institutionId: "org:university",
            });
        });
    });
});
