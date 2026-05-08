import { beforeEach, describe, expect, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import LessonReferencesFromCatalog from "../LessonReferencesFromCatalog.astro";

type LessonReferencesFromCatalogProps = {
    source?: Record<string, unknown>;
    lessonId?: string;
};

const CATALOG_WITH_PENDING_REFERENCE: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@id": "work:book-1",
            "@type": "CreativeWork",
            name: "Foundations of Pipelines",
        },
        {
            "@id": "ref:chapter-1",
            "@type": "Book",
            name: "Chapter One",
            pageStart: 9,
            isPartOf: { "@id": "work:book-1" },
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

let renderReferences: AstroRender<LessonReferencesFromCatalogProps>;

describe.concurrent("LessonReferencesFromCatalog.astro render", () => {
    beforeEach(async () => {
        renderReferences = await createAstroRenderer<LessonReferencesFromCatalogProps>(
            LessonReferencesFromCatalog,
        );
    });

    test("renders references from the shared catalog with explicit lessonId", async () => {
        const html = await renderReferences({
            lessonId: "/notes/scripting/pipelines/nushell/",
        });

        expect(html).toContain("Pipelines");
        expect(html).toContain("nushell.sh/book/pipelines.html");
    });

    test("resolves lessonId from Astro.url.pathname", async () => {
        const html = await renderReferences(
            {},
            {
                request: new Request(
                    "https://dibs.ravenhill.cl/notes/scripting/pipelines/nushell/",
                ),
            },
        );

        expect(html).toContain("Pipelines");
        expect(html).toContain("nushell.sh/book/pipelines.html");
    });

    test("keeps pending-revision hidden by default", async () => {
        const html = await renderReferences({
            source: CATALOG_WITH_PENDING_REFERENCE,
            lessonId: "/notes/lesson-a/",
        });

        expect(html).toContain("Chapter One");
        expect(html).not.toContain("Internal Draft");
    });
});
