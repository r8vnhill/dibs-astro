import { beforeEach, describe, expect, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import ReferencesFromJsonLd from "../ReferencesFromJsonLd.astro";

type ReferencesFromJsonLdProps = {
    source: Record<string, unknown>;
    recommended: string[];
    additional?: string[];
    strict?: boolean;
};

const BIBLIOGRAPHY: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
        {
            "@type": "Book",
            identifier: "pipeline-connecting-commands",
            name: "The pipeline: Connecting commands",
            isPartOf: {
                "@type": "Book",
                name: "Learn PowerShell in a month of lunches",
            },
        },
        {
            "@type": "WebPage",
            identifier: "collection-pipeline-fowler",
            name: "Collection Pipeline",
            url: "https://martinfowler.com/articles/collection-pipeline/",
        },
        {
            "@type": "ScholarlyArticle",
            identifier: "bash-in-the-wild",
            name: "Bash in the Wild: Language Usage, Code Smells, and Bugs",
            url: "https://doi.org/10.1145/3517193",
            isPartOf: {
                "@type": "Periodical",
                name: "ACM Transactions on Software Engineering and Methodology",
            },
        },
        {
            "@type": "Thesis",
            identifier: "bash-usage-thesis",
            name: "An Empirical Study on Bash Language Usage in Github",
            url: "http://hdl.handle.net/10012/17036",
            publisher: {
                "@type": "CollegeOrUniversity",
                name: "University of Waterloo",
            },
        },
    ],
};

let renderReferences: AstroRender<ReferencesFromJsonLdProps>;

describe.concurrent("ReferencesFromJsonLd.astro render", () => {
    beforeEach(async () => {
        renderReferences = await createAstroRenderer<ReferencesFromJsonLdProps>(
            ReferencesFromJsonLd,
        );
    });

    test("keeps normalized titles when only description-* slots are provided", async () => {
        const html = await renderReferences(
            {
                source: BIBLIOGRAPHY,
                recommended: ["pipeline-connecting-commands"],
                additional: ["collection-pipeline-fowler"],
            },
            {
                slots: {
                    "description-pipeline-connecting-commands": "Descripción A",
                    "description-collection-pipeline-fowler": "Descripción B",
                },
            },
        );

        expect(html).toContain("The pipeline: Connecting commands");
        expect(html).toContain("Collection Pipeline");
        expect(html).toContain("Descripción A");
        expect(html).toContain("Descripción B");
    });

    test("uses title-* slot override when it has meaningful content", async () => {
        const html = await renderReferences(
            {
                source: BIBLIOGRAPHY,
                recommended: ["pipeline-connecting-commands"],
            },
            {
                slots: {
                    "title-pipeline-connecting-commands": "Título personalizado",
                },
            },
        );

        expect(html).toContain("Título personalizado");
        expect(html).not.toContain("The pipeline: Connecting commands");
    });

    test("renders scholarly articles and theses from JSON-LD", async () => {
        const html = await renderReferences({
            source: BIBLIOGRAPHY,
            recommended: ["bash-in-the-wild"],
            additional: ["bash-usage-thesis"],
        });

        expect(html).toContain("Bash in the Wild: Language Usage, Code Smells, and Bugs");
        expect(html).toContain("ACM Transactions on Software Engineering and Methodology");
        expect(html).toContain("An Empirical Study on Bash Language Usage in Github");
        expect(html).toContain("University of Waterloo");
    });
});
