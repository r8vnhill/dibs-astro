import { describe, expect, it } from "vitest";
import fs from "node:fs";
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
        expect(catalog.referencesById.get("ref:article-1")).toMatchObject({
            publication: "TOSEM",
            publicationUrl: "https://dl.acm.org/journal/tosem",
        });
        expect(catalog.referencesById.get("ref:thesis-1")).toMatchObject({
            institution: "University of Waterloo",
            institutionUrl: "https://uwaterloo.ca/",
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
            "/notes/software-libraries/scripting/pipelines/nushell/",
        );

        expect(grouped.recommended).not.toHaveLength(0);
        expect(grouped.recommended.map((entry) => entry.reference.id)).toContain(
            "ref:nushell-pipelines",
        );
        expect(catalog.lessonsById.has("/notes/software-libraries/scripting/pipelines/nushell/"))
            .toBe(true);
        expect(catalog.referencesById.has("ref:nushell-pipelines")).toBe(true);
    });
});
