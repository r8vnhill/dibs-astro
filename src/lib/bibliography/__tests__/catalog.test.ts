import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
    getMostCitedBooks,
    getReferencesForLesson,
    getReferenceStats,
    loadBibliographyCatalog,
} from "../catalog";

const CATALOG = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@id": "person:author-1",
            "@type": "Person",
            givenName: "Ada",
            familyName: "Lovelace",
        },
        {
            "@id": "work:book-1",
            "@type": "CreativeWork",
            name: "Foundations of Pipelines",
            author: [{ "@id": "person:author-1" }],
        },
        {
            "@id": "ref:chapter-1",
            "@type": "Book",
            name: "Chapter One",
            isPartOf: { "@id": "work:book-1" },
            author: [{ "@id": "person:author-1" }],
        },
        {
            "@id": "ref:web-1",
            "@type": "WebPage",
            name: "Reference Docs",
            url: "https://example.com/docs",
        },
        {
            "@id": "ref:video-1",
            "@type": "VideoObject",
            name: "Nushell: A new type of shell!",
            url: "https://www.youtube.com/watch?v=GPqV6rLfKR4",
            publisher: { "@id": "org:dispatch" },
        },
        {
            "@id": "org:dispatch",
            "@type": "Organization",
            name: "Dispatch",
            url: "https://www.youtube.com/",
        },
        {
            "@id": "/notes/lesson-a/",
            "@type": "LearningResource",
            name: "Lesson A",
        },
        {
            "@id": "/notes/lesson-b/",
            "@type": "LearningResource",
            name: "Lesson B",
        },
        {
            "@id": "usage:a:recommended",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/lesson-a/" },
            "dibs:reference": { "@id": "ref:chapter-1" },
            "dibs:tags": ["recommended"],
        },
        {
            "@id": "usage:a:pending",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/lesson-a/" },
            "dibs:reference": { "@id": "ref:web-1" },
            "dibs:tags": ["pending-revision"],
        },
        {
            "@id": "usage:b:additional",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/lesson-b/" },
            "dibs:reference": { "@id": "ref:chapter-1" },
            "dibs:tags": ["additional"],
        },
    ],
};

describe("bibliography catalog", () => {
    it("loads graph nodes and resolves linked author/book metadata", () => {
        const catalog = loadBibliographyCatalog(CATALOG);
        const chapter = catalog.referencesById.get("ref:chapter-1");

        expect(chapter).toMatchObject({
            id: "ref:chapter-1",
            type: "Book",
            bookTitle: "Foundations of Pipelines",
            bookId: "work:book-1",
        });
        expect(chapter?.authors).toHaveLength(1);
    });

    it("loads video references with platform metadata", () => {
        const catalog = loadBibliographyCatalog(CATALOG);
        const video = catalog.referencesById.get("ref:video-1");

        expect(video).toMatchObject({
            id: "ref:video-1",
            type: "VideoObject",
            platform: "Dispatch",
            platformUrl: "https://www.youtube.com/",
            publisherName: "Dispatch",
        });
    });

    it("preserves metadata urls for web-like references", () => {
        const catalog = loadBibliographyCatalog({
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@id": "site:example-docs",
                    "@type": "WebSite",
                    name: "Example Docs",
                    url: "https://docs.example/",
                },
                {
                    "@id": "org:nushell",
                    "@type": "Organization",
                    name: "Nushell",
                    url: "https://www.nushell.sh/",
                },
                {
                    "@id": "pub:tosem",
                    "@type": "Periodical",
                    name: "TOSEM",
                    url: "https://dl.acm.org/journal/tosem",
                },
                {
                    "@id": "org:waterloo",
                    "@type": "CollegeOrUniversity",
                    name: "University of Waterloo",
                    url: "https://uwaterloo.ca/",
                },
                {
                    "@id": "ref:web-1",
                    "@type": "WebPage",
                    name: "Pipelines",
                    url: "https://www.nushell.sh/book/pipelines.html",
                    publisher: { "@id": "org:nushell" },
                },
                {
                    "@id": "ref:web-site-1",
                    "@type": "WebPage",
                    name: "Guidelines",
                    url: "https://docs.example/guidelines",
                    isPartOf: { "@id": "site:example-docs" },
                    publisher: { "@id": "org:nushell" },
                },
                {
                    "@id": "ref:article-1",
                    "@type": "ScholarlyArticle",
                    name: "Bash in the Wild",
                    url: "https://doi.org/10.1145/3517193",
                    isPartOf: { "@id": "pub:tosem" },
                },
                {
                    "@id": "ref:thesis-1",
                    "@type": "Thesis",
                    name: "Bash Study",
                    url: "http://hdl.handle.net/10012/17036",
                    publisher: { "@id": "org:waterloo" },
                },
            ],
        });

        expect(catalog.referencesById.get("ref:web-1")).toMatchObject({
            location: "Nushell",
            locationUrl: "https://www.nushell.sh/",
        });
        expect(catalog.referencesById.get("ref:web-site-1")).toMatchObject({
            location: "Example Docs",
            locationUrl: "https://docs.example/",
            publisherName: "Nushell",
            publisherUrl: "https://www.nushell.sh/",
        });
        expect(catalog.referencesById.get("ref:article-1")).toMatchObject({
            publication: "TOSEM",
            publicationUrl: "https://dl.acm.org/journal/tosem",
        });
        expect(catalog.referencesById.get("ref:thesis-1")).toMatchObject({
            institution: "University of Waterloo",
            institutionUrl: "https://uwaterloo.ca/",
        });
    });

    it("falls back to the reference hostname for web and video metadata when no publisher is linked", () => {
        const catalog = loadBibliographyCatalog({
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@id": "ref:web-fallback",
                    "@type": "WebPage",
                    name: "Pipeline Docs",
                    url: "https://docs.example.com/pipelines",
                },
                {
                    "@id": "ref:video-fallback",
                    "@type": "VideoObject",
                    name: "Pipeline Walkthrough",
                    url: "https://media.example.org/watch/pipelines",
                },
            ],
        });

        expect(catalog.referencesById.get("ref:web-fallback")).toMatchObject({
            location: "docs.example.com",
            locationUrl: "https://docs.example.com/pipelines",
        });
        expect(catalog.referencesById.get("ref:video-fallback")).toMatchObject({
            platform: "media.example.org",
            platformUrl: "https://media.example.org/watch/pipelines",
        });
    });

    it("hides pending-revision by default when resolving references for a lesson", () => {
        const catalog = loadBibliographyCatalog(CATALOG);
        const grouped = getReferencesForLesson(catalog, "/notes/lesson-a/");

        expect(grouped.recommended).toHaveLength(1);
        expect(grouped.additional).toHaveLength(0);
        expect(grouped.pendingRevision).toHaveLength(0);
        expect(grouped.recommended[0]?.reference.id).toBe("ref:chapter-1");
    });

    it("can include pending-revision explicitly", () => {
        const catalog = loadBibliographyCatalog(CATALOG);
        const grouped = getReferencesForLesson(catalog, "/notes/lesson-a/", {
            includeTags: ["recommended", "pending-revision"],
            includePendingRevision: true,
        });

        expect(grouped.pendingRevision).toHaveLength(1);
        expect(grouped.pendingRevision[0]?.reference.id).toBe("ref:web-1");
    });

    it("skips malformed references when they are used only as pending-revision", () => {
        const catalog = loadBibliographyCatalog({
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@id": "ref:broken-book",
                    "@type": "Book",
                    name: "Broken draft book",
                },
                {
                    "@id": "/notes/lesson-a/",
                    "@type": "LearningResource",
                    name: "Lesson A",
                },
                {
                    "@id": "usage:a:pending-broken",
                    "@type": "dibs:ReferenceUsage",
                    "dibs:lesson": { "@id": "/notes/lesson-a/" },
                    "dibs:reference": { "@id": "ref:broken-book" },
                    "dibs:tags": ["pending-revision"],
                },
            ],
        });

        expect(catalog.referencesById.has("ref:broken-book")).toBe(false);
        expect(getReferencesForLesson(catalog, "/notes/lesson-a/").recommended).toHaveLength(0);
    });

    it("keeps strict failures for malformed visible references", () => {
        expect(() =>
            loadBibliographyCatalog({
                "@context": "https://schema.org",
                "@graph": [
                    {
                        "@id": "ref:broken-book",
                        "@type": "Book",
                        name: "Broken visible book",
                    },
                    {
                        "@id": "/notes/lesson-a/",
                        "@type": "LearningResource",
                        name: "Lesson A",
                    },
                    {
                        "@id": "usage:a:recommended-broken",
                        "@type": "dibs:ReferenceUsage",
                        "dibs:lesson": { "@id": "/notes/lesson-a/" },
                        "dibs:reference": { "@id": "ref:broken-book" },
                        "dibs:tags": ["recommended"],
                    },
                ],
            })
        ).toThrow(/missing a resolvable "isPartOf"/);
    });

    it("computes reference and book citation stats across lessons", () => {
        const catalog = loadBibliographyCatalog(CATALOG);
        const stats = getReferenceStats(catalog);
        const books = getMostCitedBooks(catalog);

        expect(stats[0]).toMatchObject({
            referenceId: "ref:chapter-1",
            citationCount: 2,
            lessonCount: 2,
        });
        expect(books[0]).toMatchObject({
            bookId: "work:book-1",
            citationCount: 2,
            lessonCount: 2,
        });
    });

    it("keeps the pipelines Nushell lesson wired to its recommended catalog reference", () => {
        const generatedCatalog = JSON.parse(
            fs.readFileSync("src/data/bibliography/catalog.graph.generated.jsonld", "utf8"),
        );
        const catalog = loadBibliographyCatalog(generatedCatalog, {
            sourceLabel: "generated bibliography catalog",
        });

        const grouped = getReferencesForLesson(
            catalog,
            "/notes/scripting/pipelines/nushell/",
        );

        expect(grouped.recommended).not.toHaveLength(0);
        expect(grouped.recommended.map((entry) => entry.reference.id)).toContain(
            "ref:nushell-pipelines",
        );
        expect(catalog.lessonsById.has("/notes/scripting/pipelines/nushell/"))
            .toBe(true);
        expect(catalog.referencesById.has("ref:nushell-pipelines")).toBe(true);
    });

    it("keeps the support-scripts lesson wired to its recommended Kotlin reference", () => {
        const generatedCatalog = JSON.parse(
            fs.readFileSync("src/data/bibliography/catalog.graph.generated.jsonld", "utf8"),
        );
        const catalog = loadBibliographyCatalog(generatedCatalog, {
            sourceLabel: "generated bibliography catalog",
        });

        const grouped = getReferencesForLesson(
            catalog,
            "/notes/scripting/support-scripts/",
        );

        expect(grouped.recommended).not.toHaveLength(0);
        expect(grouped.recommended.map((entry) => entry.reference.id)).toContain(
            "ref:kotlin-custom-scripting-tutorial",
        );
        expect(catalog.lessonsById.has("/notes/scripting/support-scripts/"))
            .toBe(true);
        expect(catalog.referencesById.has("ref:kotlin-custom-scripting-tutorial")).toBe(true);
    });
});
