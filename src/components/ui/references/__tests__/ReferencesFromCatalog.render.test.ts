import { beforeEach, describe, expect, test } from "vitest";
import fs from "node:fs";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import ReferencesFromCatalog from "../ReferencesFromCatalog.astro";

type ReferencesFromCatalogProps = {
    source: Record<string, unknown>;
    lessonId?: string;
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
            pageStart: 9,
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
            "@id": "ref:video-1",
            "@type": "VideoObject",
            name: "A new type of shell!",
            url: "https://www.youtube.com/watch?v=GPqV6rLfKR4",
            datePublished: "2024-11-29",
            author: [{ "@id": "person:author-1" }],
            publisher: {
                "@id": "org:dispatch",
            },
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
            "@id": "usage:a:additional-video",
            "@type": "dibs:ReferenceUsage",
            "dibs:lesson": { "@id": "/notes/lesson-a/" },
            "dibs:reference": { "@id": "ref:video-1" },
            "dibs:tags": ["additional"],
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
        expect(html).toContain("(p. 9)");
        expect(html).toContain("A new type of shell!");
        expect(html).toContain("Dispatch");
        expect(html).not.toContain("Internal Draft");
    });

    test("does not render the additional references section when it is empty", async () => {
        const catalogWithoutAdditional = {
            ...CATALOG,
            "@graph": (CATALOG["@graph"] as Record<string, unknown>[]).filter(
                (node) => node["@id"] !== "usage:a:additional-video",
            ),
        };

        const html = await renderReferences({
            source: catalogWithoutAdditional,
            lessonId: "/notes/lesson-a/",
        });

        expect(html).not.toContain("Referencias adicionales");
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

    test("renders video references with platform and author metadata", async () => {
        const html = await renderReferences({
            source: CATALOG,
            lessonId: "/notes/lesson-a/",
        });

        expect(html).toContain("A new type of shell!");
        expect(html).toContain("Ada Lovelace");
        expect(html).toContain("Dispatch");
        expect(html).toContain("2024-11-29");
    });

    test("can resolve the lesson id from Astro.url.pathname", async () => {
        const html = await renderReferences(
            {
                source: CATALOG,
            },
            {
                request: new Request("https://dibs.ravenhill.cl/notes/lesson-a/"),
            },
        );

        expect(html).toContain("Chapter One");
        expect(html).not.toContain("Internal Draft");
    });

    describe("DDT: reference slot overrides by type", () => {
        test("applies title slot override to Book references", async () => {
            const html = await renderReferences(
                {
                    source: CATALOG,
                    lessonId: "/notes/lesson-a/",
                },
                {
                    slots: {
                        "title-ref:chapter-1": "Custom Chapter Title",
                    },
                },
            );

            expect(html).toContain("Custom Chapter Title");
            expect(html).not.toContain("Chapter One");
        });

        test("applies description slot override without affecting normalized title", async () => {
            const html = await renderReferences(
                {
                    source: CATALOG,
                    lessonId: "/notes/lesson-a/",
                },
                {
                    slots: {
                        "description-ref:chapter-1": "Custom description text",
                    },
                },
            );

            expect(html).toContain("Chapter One");
            expect(html).toContain("Custom description text");
        });
    });

    test("applies title slot override without affecting other references", async () => {
        const html = await renderReferences(
            {
                source: CATALOG,
                lessonId: "/notes/lesson-a/",
            },
            {
                slots: {
                    "title-ref:chapter-1": "Modified Title",
                },
            },
        );

        expect(html).toContain("Modified Title");
        expect(html).not.toContain("Chapter One");
    });

    test("renders the real recommended reference for pipelines/nushell with its description slot", async () => {
        const generatedCatalog = JSON.parse(
            fs.readFileSync("src/data/bibliography/catalog.graph.generated.jsonld", "utf8"),
        );

        const html = await renderReferences(
            {
                source: generatedCatalog,
                lessonId: "/notes/software-libraries/scripting/pipelines/nushell/",
            },
            {
                slots: {
                    "description-ref:nushell-pipelines":
                        "Descripción de prueba para la referencia recomendada de pipelines en Nushell.",
                },
            },
        );

        expect(html).toContain("Pipelines");
        expect(html).toContain("Descripción de prueba para la referencia recomendada");
        expect(html).toContain("nushell.sh/book/pipelines.html");
        expect(html).toContain('href="https://www.nushell.sh/"');
        expect(html).toMatch(/>\s*Nushell\s*<\/a>/);
    });
});
