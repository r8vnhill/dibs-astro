import { describe, expect, it } from "vitest";
import {
    buildArtifact,
    findNode,
    graphOf,
    idsOf,
    lessonNode,
    personAda,
    prefixBlock,
    referenceChapter1,
    usageNode,
    validBaseFixture,
    workBook1,
} from "./build-bibliography-catalog.support";

describe("buildCatalogArtifactFromTurtle happy path and normalization", () => {
    it("builds an exact graph artifact consumable by the catalog loader", () => {
        const artifact = buildArtifact(validBaseFixture);
        const graph = artifact["@graph"];

        expect(graph).toHaveLength(7);
        expect(idsOf(graph).sort()).toEqual([
            "/notes/lesson-a/",
            "person:ada",
            "ref:chapter-1",
            "ref:video-1",
            "usage:lesson-a-chapter-1",
            "usage:lesson-a-video-1",
            "work:book-1",
        ]);

        expect(findNode(graph, "person:ada")).toEqual({
            "@id": "person:ada",
            "@type": "Person",
            givenName: "Ada",
            familyName: "Lovelace",
        });

        expect(findNode(graph, "/notes/lesson-a/")).toEqual({
            "@id": "/notes/lesson-a/",
            "@type": "LearningResource",
            name: "Lesson A",
            url: "/notes/lesson-a/",
        });

        expect(findNode(graph, "ref:chapter-1")).toEqual({
            "@id": "ref:chapter-1",
            "@type": "Book",
            name: "Chapter One",
            author: [{ "@id": "person:ada" }],
            isPartOf: { "@id": "work:book-1" },
            pageStart: 10,
            pageEnd: 20,
        });

        expect(findNode(graph, "usage:lesson-a-chapter-1")).toEqual({
            "@id": "usage:lesson-a-chapter-1",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/lesson-a/" },
            "dibs:reference": { "@id": "ref:chapter-1" },
            "dibs:tags": ["recommended"],
        });
    });

    it("deduplicates duplicated dibs:tag values while preserving valid tags", () => {
        const ttl = `
${prefixBlock}
${personAda}
${workBook1}
${referenceChapter1}
${lessonNode("/notes/lesson-a/", "Lesson A")}
${
            usageNode("lesson-a-chapter-1", "/notes/lesson-a/", "ref:chapter-1", [
                "recommended",
                "recommended",
                "additional",
            ])
        }
`;

        expect(findNode(graphOf(ttl), "usage:lesson-a-chapter-1")).toEqual({
            "@id": "usage:lesson-a-chapter-1",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/lesson-a/" },
            "dibs:reference": { "@id": "ref:chapter-1" },
            "dibs:tags": ["recommended", "additional"],
        });
    });

    it("keeps the same reference when used by multiple lessons", () => {
        const ttl = `
${prefixBlock}
${personAda}
${workBook1}
${referenceChapter1}
${lessonNode("/notes/lesson-a/", "Lesson A")}
${lessonNode("/notes/lesson-b/", "Lesson B")}
${usageNode("lesson-a-chapter-1", "/notes/lesson-a/", "ref:chapter-1", "recommended")}
${usageNode("lesson-b-chapter-1", "/notes/lesson-b/", "ref:chapter-1", "additional")}
`;

        const graph = graphOf(ttl);

        expect(idsOf(graph)).toEqual([
            "person:ada",
            "work:book-1",
            "ref:chapter-1",
            "/notes/lesson-a/",
            "/notes/lesson-b/",
            "usage:lesson-a-chapter-1",
            "usage:lesson-b-chapter-1",
        ]);
        expect(findNode(graph, "ref:chapter-1")).toBeDefined();
        expect(findNode(graph, "usage:lesson-a-chapter-1")).toBeDefined();
        expect(findNode(graph, "usage:lesson-b-chapter-1")).toBeDefined();
    });

    it("keeps distinct usages when the same lesson cites the same reference multiple times", () => {
        const ttl = `
${prefixBlock}
${personAda}
${workBook1}
${referenceChapter1}
${lessonNode("/notes/lesson-a/", "Lesson A")}
${usageNode("lesson-a-chapter-1-recommended", "/notes/lesson-a/", "ref:chapter-1", "recommended")}
${usageNode("lesson-a-chapter-1-additional", "/notes/lesson-a/", "ref:chapter-1", "additional")}
`;

        const graph = graphOf(ttl);

        expect(findNode(graph, "usage:lesson-a-chapter-1-recommended")).toBeDefined();
        expect(findNode(graph, "usage:lesson-a-chapter-1-additional")).toBeDefined();
        expect(findNode(graph, "ref:chapter-1")).toBeDefined();
    });

    it("builds a reference through the bound-source reader facade", () => {
        const ttl = `
${prefixBlock}
${personAda}
work:reader-facade a schema:CreativeWork ;
  schema:name "Reader Facade Source" .

ref:reader-facade a schema:ScholarlyArticle ;
  schema:name "Reader Facade Pilot" ;
  schema:url "https://example.test/reader-facade" ;
  schema:datePublished "2026" ;
  schema:pageStart 7 ;
  schema:pageEnd 13 ;
  schema:author person:ada ;
  schema:isPartOf work:reader-facade .
`;

        expect(findNode(graphOf(ttl), "ref:reader-facade")).toEqual({
            "@id": "ref:reader-facade",
            "@type": "ScholarlyArticle",
            name: "Reader Facade Pilot",
            url: "https://example.test/reader-facade",
            datePublished: "2026",
            pageStart: 7,
            pageEnd: 13,
            author: [{ "@id": "person:ada" }],
            isPartOf: { "@id": "work:reader-facade" },
        });
    });
});
