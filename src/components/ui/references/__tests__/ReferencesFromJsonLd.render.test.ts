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
            pageStart: 22,
            pageEnd: 1,
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
        expect(html).toContain("(pp. 1-22)");
        expect(html).toContain("An Empirical Study on Bash Language Usage in Github");
        expect(html).toContain("University of Waterloo");
    });

    describe("DDT: reference types with slot overrides", () => {
        test.each<{
            name: string;
            refId: string;
            titleOverride?: string;
            publicationOverride?: string;
            institutionOverride?: string;
            expectedTitle?: string;
            expectedPublication?: string;
            expectedInstitution?: string;
            notContains?: string;
        }>([
            {
                name: "Book with title override",
                refId: "pipeline-connecting-commands",
                titleOverride: "Custom Book Title",
                expectedTitle: "Custom Book Title",
                notContains: "The pipeline: Connecting commands",
            },
            {
                name: "WebPage with title override",
                refId: "collection-pipeline-fowler",
                titleOverride: "Custom Web Title",
                expectedTitle: "Custom Web Title",
                notContains: "Collection Pipeline",
            },
            {
                name: "Article with publication override",
                refId: "bash-in-the-wild",
                publicationOverride: "Custom Publication",
                expectedTitle: "Bash in the Wild: Language Usage, Code Smells, and Bugs",
                expectedPublication: "Custom Publication",
                notContains: "ACM Transactions",
            },
            {
                name: "Thesis with institution override",
                refId: "bash-usage-thesis",
                institutionOverride: "Custom University",
                expectedTitle: "An Empirical Study on Bash Language Usage in Github",
                expectedInstitution: "Custom University",
                notContains: "University of Waterloo",
            },
        ])(
            "$name",
            async ({
                refId,
                titleOverride,
                publicationOverride,
                institutionOverride,
                expectedTitle,
                expectedPublication,
                expectedInstitution,
                notContains,
            }) => {
                const slots: Record<string, string> = {};

                if (titleOverride) {
                    slots[`title-${refId}`] = titleOverride;
                }
                if (publicationOverride) {
                    slots[`publication-${refId}`] = publicationOverride;
                }
                if (institutionOverride) {
                    slots[`institution-${refId}`] = institutionOverride;
                }

                const html = await renderReferences(
                    {
                        source: BIBLIOGRAPHY,
                        recommended: [refId],
                    },
                    { slots },
                );

                if (expectedTitle) {
                    expect(html).toContain(expectedTitle);
                }
                if (expectedPublication) {
                    expect(html).toContain(expectedPublication);
                }
                if (expectedInstitution) {
                    expect(html).toContain(expectedInstitution);
                }
                if (notContains) {
                    expect(html).not.toContain(notContains);
                }
            },
        );
    });

    describe("DDT: fallback title extraction from raw source", () => {
        test.each<{
            name: string;
            source: Record<string, unknown>;
            refId: string;
            expectedInHtml: string;
        }>([
            {
                name: "extracts name as fallback when available",
                source: {
                    itemListElement: [
                        {
                            "@type": "WebPage",
                            identifier: "web-1",
                            name: "Web Title from Name Field",
                            url: "https://example.com",
                        },
                    ],
                },
                refId: "web-1",
                expectedInHtml: "Web Title from Name Field",
            },
            {
                name: "uses headline as fallback when name is missing",
                source: {
                    itemListElement: [
                        {
                            "@type": "WebPage",
                            identifier: "web-2",
                            headline: "Web Title from Headline",
                            url: "https://example.com",
                        },
                    ],
                },
                refId: "web-2",
                expectedInHtml: "Web Title from Headline",
            },
        ])("$name", async ({ source, refId, expectedInHtml }) => {
            const html = await renderReferences({
                source,
                recommended: [refId],
                strict: false,
            });

            expect(html).toContain(expectedInHtml);
        });
    });

    test("renders recommended and additional sections together", async () => {
        const html = await renderReferences({
            source: BIBLIOGRAPHY,
            recommended: ["pipeline-connecting-commands", "collection-pipeline-fowler"],
            additional: ["bash-in-the-wild", "bash-usage-thesis"],
        });

        // Recommended section should contain first two references
        expect(html).toContain("The pipeline: Connecting commands");
        expect(html).toContain("Collection Pipeline");

        // Additional section should contain last two references
        expect(html).toContain("Bash in the Wild");
        expect(html).toContain("University of Waterloo");
    });
});
