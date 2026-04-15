/**
 * Render-contract tests for {@link ScholarlyArticle}.
 *
 * This suite verifies the public rendering behavior of the reference component rather than its internal implementation
 * details. The goal is to keep the tests focused on observable contracts:
 *
 * - how the component resolves content from props and named slots;
 * - how representative page metadata is rendered;
 * - when title and publication values become links;
 * - how optional description content is included or omitted; and
 * - how the component fails when a required title source is missing.
 *
 * The suite intentionally renders the component through the shared Astro test helper and inspects  the resulting HTML
 * with direct string assertions. That keeps the tests lightweight and close to the component's external output without
 * introducing a heavier DOM-query layer.
 *
 * `suite.concurrent(...)` is kept intentionally. Each test renders through a local helper that creates a fresh
 * renderer per call, so there is no shared mutable renderer state across tests.
 */

import { type AstroRender, createAstroRenderer } from "$test-utils/astro-render";
import { describe, expect, suite, test } from "vitest";
import { MissingReferenceTitleError } from "../ReferenceContractError";
import ScholarlyArticle from "../ScholarlyArticle.astro";

/**
 * Props accepted by {@link ScholarlyArticle} in these tests.
 *
 * This local type keeps the suite explicit about the contract it exercises without depending on a separately exported 
 * component-props type. The tested shape covers the title/link contract, optional publication metadata, optional page 
 * information, and optional authorship.
 */
type ScholarlyArticleProps = {
    title?: string;
    url: string;
    publication?: string;
    publicationUrl?: string;
    pages?: { start: number; end?: number };
    author?: string;
};

/**
 * Optional render configuration accepted by the Astro renderer helper.
 *
 * In practice this is used to pass named slots such as `title`, `publication`, `author`, and `description` while 
 * preserving the renderer's native option shape.
 */
type RenderOptions = Parameters<AstroRender<ScholarlyArticleProps>>[1];

/**
 * Renders {@link ScholarlyArticle} with the supplied props and optional slots.
 *
 * This helper keeps each test self-contained by creating a fresh Astro renderer for every render call. That avoids 
 * shared mutable setup while keeping the suite safe under concurrent execution.
 *
 * @param props Component props under test.
 * @param options Optional Astro render options, typically used to provide named slot content.
 * @returns The rendered HTML string produced by the component.
 */
async function renderArticle(
    props: ScholarlyArticleProps,
    options?: RenderOptions,
): Promise<string> {
    const render = await createAstroRenderer<ScholarlyArticleProps>(ScholarlyArticle);
    return render(props, options);
}

suite.concurrent("ScholarlyArticle.astro", () => {
    /**
     * These tests cover how the component chooses between props and slots when both can provide title, publication, or 
     * author content.
     */
    describe("content resolution", () => {
        test("renders title, publication, and author from props", async ({ expect }) => {
            const html = await renderArticle({
                title: "Blood Oath Beneath the Ashen Moon",
                url: "https://example.com/blood-oath-beneath-the-ashen-moon",
                publication: "Chronicles of Severed Fate",
                author: "Reina Kurose",
            });

            expect(html).toContain("Blood Oath Beneath the Ashen Moon");
            expect(html).toContain("Chronicles of Severed Fate");
            expect(html).toContain("Reina Kurose");
            expect(html).toContain(">en<");
            expect(html).toContain(">por<");
        });

        test(
            "prefers meaningful title, publication, and author slot content over props",
            async ({ expect }) => {
                const html = await renderArticle(
                    {
                        title: "Base Chronicle",
                        url: "https://example.com/fated-article",
                        publication: "Base Record",
                        author: "Base Author",
                    },
                    {
                        slots: {
                            title: "The Crimson Thread of Our Last Promise",
                            publication: "Archive of Broken Names",
                            author: "Itsuki Amaya",
                        },
                    },
                );

                expect(html).toContain("The Crimson Thread of Our Last Promise");
                expect(html).toContain("Archive of Broken Names");
                expect(html).toContain("Itsuki Amaya");
                expect(html).not.toContain("Base Chronicle");
                expect(html).not.toContain("Base Record");
                expect(html).not.toContain("Base Author");
            },
        );

        test(
            "falls back to props when title, publication, or author slots are empty",
            async ({ expect }) => {
                const html = await renderArticle(
                    {
                        title: "The Garden Where the Vow Remained",
                        url: "https://example.com/garden-vow",
                        publication: "Letters from the Hollow Dawn",
                        author: "Mika Tohno",
                    },
                    {
                        slots: {
                            title: "<!-- empty -->",
                            publication: "   ",
                            author: "<!-- no content -->",
                        },
                    },
                );

                expect(html).toContain("The Garden Where the Vow Remained");
                expect(html).toContain("Letters from the Hollow Dawn");
                expect(html).toContain("Mika Tohno");
            },
        );
    });

    /**
     * This section checks that already-formatted page metadata is surfaced correctly for representative single-page 
     * and page-range cases.
     */
    describe("page rendering", () => {
        test.each([
            [{ start: 7 }, "(p. 7)"],
            [{ start: 7, end: 12 }, "(pp. 7–12)"],
        ])("renders pages %j as %s", async (pages, expected) => {
            const html = await renderArticle({
                title: "The House That Remembered Our Names",
                url: "https://example.com/remembered-names",
                pages,
            });

            expect(html).toContain(expected);
        });
    });

    /**
     * **These tests protect the link contract of the component:** the article title should point to the article URL, 
     * while publication text only becomes a link when an explicit publication URL is present.
     */
    describe("link rendering", () => {
        test("links the title to the article URL", async ({ expect }) => {
            const html = await renderArticle({
                title: "Blood Oath Beneath the Ashen Moon",
                url: "https://example.com/blood-oath-beneath-the-ashen-moon",
            });

            expect(html).toContain("Blood Oath Beneath the Ashen Moon");
            expect(html).toContain(
                "href=\"https://example.com/blood-oath-beneath-the-ashen-moon\"",
            );
        });

        test("links the publication when publicationUrl is present", async ({ expect }) => {
            const html = await renderArticle({
                title: "Blood Oath Beneath the Ashen Moon",
                url: "https://example.com/blood-oath-beneath-the-ashen-moon",
                publication: "Chronicles of Severed Fate",
                publicationUrl: "https://example.com/publications/chronicles-of-severed-fate",
            });

            expect(html).toContain("Chronicles of Severed Fate");
            expect(html).toContain(
                "href=\"https://example.com/publications/chronicles-of-severed-fate\"",
            );
        });

        test("renders publication as plain text when publicationUrl is absent", async ({ expect }) => {
            const html = await renderArticle({
                title: "The Last Heir of the Scarlet Estate",
                url: "https://example.com/last-heir-scarlet-estate",
                publication: "Chronicles of Severed Fate",
            });

            expect(html).toContain("Chronicles of Severed Fate");
            expect(html).not.toContain("href=\"Chronicles of Severed Fate\"");
            expect(html).not.toContain("publications/chronicles-of-severed-fate");
        });
    });

    /**
     * Optional-content tests verify that the component includes additional descriptive material only when meaningful 
     * slot content is provided.
     */
    describe("optional content", () => {
        test("renders the description slot when it has meaningful content", async ({ expect }) => {
            const html = await renderArticle(
                {
                    title: "The Orchard of Unspoken Farewells",
                    url: "https://example.com/orchard-farewells",
                },
                {
                    slots: {
                        description:
                            "A fictional archival note on bloodlines, memory, and promises "
                            + "that outlive the people who made them.",
                    },
                },
            );

            expect(html).toContain(
                "A fictional archival note on bloodlines, memory, and promises "
                    + "that outlive the people who made them.",
            );
        });

        test("omits the description section when no description is provided", async ({ expect }) => {
            const html = await renderArticle({
                title: "The Orchard of Unspoken Farewells",
                url: "https://example.com/orchard-farewells",
            });

            expect(html).not.toContain(
                "A fictional archival note on bloodlines, memory, and promises "
                    + "that outlive the people who made them.",
            );
        });
    });

    /**
     * Failure tests protect the component's minimum content contract. A scholarly reference without any meaningful 
     * title source is invalid and should fail explicitly.
     */
    describe("failures", () => {
        test("throws when no meaningful title source exists", async ({ expect }) => {
            await expect(
                renderArticle({
                    url: "https://example.com/nameless-record",
                }),
            ).rejects.toThrow(MissingReferenceTitleError);
        });
    });
});
