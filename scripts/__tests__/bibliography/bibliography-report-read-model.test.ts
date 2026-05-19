import { describe, expect, it } from "vitest";

import {
    getMostCitedBooks,
    getReferenceStats,
    loadBibliographyCatalog,
} from "../../../src/lib/bibliography/catalog-core.mjs";
import {
    bibliographyReportCsvRows,
    buildBibliographyReport,
    formatBibliographyReportCsv,
} from "../../lib/bibliography/report-read-model.mjs";

const catalogFixture = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@id": "person:author",
            "@type": "Person",
            givenName: "Grace",
            familyName: "Hopper",
        },
        {
            "@id": "work:book",
            "@type": "CreativeWork",
            name: "Readable Systems",
        },
        {
            "@id": "ref:chapter",
            "@type": "Book",
            name: "Chapter One",
            isPartOf: { "@id": "work:book" },
            author: [{ "@id": "person:author" }],
        },
        {
            "@id": "ref:video",
            "@type": "VideoObject",
            name: "APIs in Practice",
            url: "https://example.com/apis",
            publisher: {
                "@type": "Organization",
                name: "Example Video",
                url: "https://example.com/",
            },
        },
        {
            "@id": "ref:draft",
            "@type": "WebPage",
            name: "Draft Reference",
            url: "https://example.com/draft",
        },
        {
            "@id": "/notes/a/",
            "@type": "LearningResource",
            name: "Lesson A",
        },
        {
            "@id": "/notes/b/",
            "@type": "LearningResource",
            name: "Lesson B",
        },
        {
            "@id": "usage:a:recommended",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/a/" },
            "dibs:reference": { "@id": "ref:chapter" },
            "dibs:tags": ["recommended"],
        },
        {
            "@id": "usage:a:additional-video",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/a/" },
            "dibs:reference": { "@id": "ref:video" },
            "dibs:tags": ["additional"],
        },
        {
            "@id": "usage:a:pending",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/a/" },
            "dibs:reference": { "@id": "ref:draft" },
            "dibs:tags": ["pending-revision"],
        },
        {
            "@id": "usage:b:additional",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/b/" },
            "dibs:reference": { "@id": "ref:chapter" },
            "dibs:tags": ["additional"],
        },
    ],
};

const catalogJsonLd = JSON.stringify(catalogFixture);

describe("bibliography report read model", () => {
    it("builds the report shape from the normalized catalog model", () => {
        const report = buildBibliographyReport(catalogJsonLd, {
            generatedAt: "2026-04-29T00:00:00.000Z",
            catalogPath: "src/data/bibliography/catalog.graph.generated.jsonld",
            sourceLabel: "report test catalog",
        });

        expect(report).toMatchObject({
            generatedAt: "2026-04-29T00:00:00.000Z",
            catalogPath: "src/data/bibliography/catalog.graph.generated.jsonld",
            totals: {
                references: 3,
                lessons: 2,
                usages: 4,
                visibleUsages: 3,
            },
        });
        expect(report).toHaveProperty("topReferences");
        expect(report).toHaveProperty("topBooks");
        expect(report).toHaveProperty("referencesByTagAndLesson");
    });

    it("delegates reference and book rankings to shared catalog analytics", () => {
        const catalog = loadBibliographyCatalog(catalogFixture);
        const report = buildBibliographyReport(catalogJsonLd);

        expect(report.topReferences).toEqual(getReferenceStats(catalog));
        expect(report.topBooks).toEqual(getMostCitedBooks(catalog));
    });

    it("includes visible video references and excludes pending-only usages by default", () => {
        const report = buildBibliographyReport(catalogJsonLd);

        expect(report.topReferences).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    referenceId: "ref:video",
                    type: "VideoObject",
                    citationCount: 1,
                    tags: ["additional"],
                }),
            ]),
        );
        expect(report.topReferences.map((entry) => entry.referenceId)).not.toContain("ref:draft");
        expect(report.referencesByTagAndLesson).toEqual([
            {
                lessonId: "/notes/a/",
                lessonTitle: "Lesson A",
                tag: "additional",
                count: 1,
            },
            {
                lessonId: "/notes/a/",
                lessonTitle: "Lesson A",
                tag: "recommended",
                count: 1,
            },
            {
                lessonId: "/notes/b/",
                lessonTitle: "Lesson B",
                tag: "additional",
                count: 1,
            },
        ]);
    });

    it("formats CSV rows from the report DTO", () => {
        const report = {
            topReferences: [
                {
                    referenceId: "ref:quoted",
                    type: "WebPage",
                    title: "Quoted, With \"Comma\"",
                    citationCount: 1,
                    lessonCount: 1,
                    tags: ["additional", "recommended"],
                },
            ],
        };

        expect(bibliographyReportCsvRows(report)).toEqual([
            {
                referenceId: "ref:quoted",
                type: "WebPage",
                title: "Quoted, With \"Comma\"",
                citationCount: 1,
                lessonCount: 1,
                tags: "additional; recommended",
            },
        ]);
        expect(formatBibliographyReportCsv(report)).toBe(
            "referenceId,type,title,citationCount,lessonCount,tags\n"
                + "ref:quoted,WebPage,\"Quoted, With \"\"Comma\"\"\",1,1,additional; recommended\n",
        );
    });
});
