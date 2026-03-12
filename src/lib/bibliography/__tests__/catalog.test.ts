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
});
