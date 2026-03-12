import { beforeEach, describe, expect, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import ReferencesFromCatalog from "../ReferencesFromCatalog.astro";

type ReferencesFromCatalogProps = {
    source: Record<string, unknown>;
    lessonId: string;
};

const CATALOG: Record<string, unknown> = {
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
            name: "Internal Draft",
            url: "https://example.com/draft",
        },
        {
            "@id": "/notes/lesson-a/",
            "@type": "LearningResource",
            name: "Lesson A",
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
    ],
};

let renderReferences: AstroRender<ReferencesFromCatalogProps>;

describe.concurrent("ReferencesFromCatalog.astro render", () => {
    beforeEach(async () => {
        renderReferences = await createAstroRenderer<ReferencesFromCatalogProps>(
            ReferencesFromCatalog,
        );
    });

    test("renders visible references and hides pending-revision by default", async () => {
        const html = await renderReferences({
            source: CATALOG,
            lessonId: "/notes/lesson-a/",
        });

        expect(html).toContain("Chapter One");
        expect(html).not.toContain("Internal Draft");
    });

    test("supports description slots keyed by reference id", async () => {
        const html = await renderReferences(
            {
                source: CATALOG,
                lessonId: "/notes/lesson-a/",
            },
            {
                slots: {
                    "description-ref:chapter-1": "Descripción catálogo",
                },
            },
        );

        expect(html).toContain("Descripción catálogo");
    });
});
