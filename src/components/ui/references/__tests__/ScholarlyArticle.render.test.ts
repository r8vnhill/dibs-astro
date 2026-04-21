import { type AstroRender } from "$test-utils/astro-render";
import { describe, expect, suite, test } from "vitest";
import { MissingReferenceTitleError, ReferenceContractError } from "../ReferenceContractError";
import ScholarlyArticle from "../ScholarlyArticle.astro";
import {
    expectDescriptionAbsent,
    expectDescriptionPresence,
    expectInlineMetaLink,
    expectInlineMetaPlainText,
    expectLinkedTitle,
    expectMetaLabelAbsent,
    expectSlotOverridesProp,
    renderReference,
} from "./reference-render-contracts";

type ScholarlyArticleProps = {
    title?: string;
    url: string;
    publication?: string;
    publicationUrl?: string;
    pages?: { start: number; end?: number };
    author?: string;
};

type RenderOptions = Parameters<AstroRender<ScholarlyArticleProps>>[1];
type RenderOverrides = Omit<Partial<ScholarlyArticleProps>, "title"> & {
    title?: string | undefined;
};

const BASE_PROPS = {
    title: "Base scholarly article title",
    url: "https://example.com/article",
} satisfies ScholarlyArticleProps;

async function renderArticle(
    overrides: RenderOverrides = {},
    options?: RenderOptions,
) {
    const merged = { ...BASE_PROPS, ...overrides };
    const props = merged.title === undefined
        ? (({ title: _title, ...rest }) => rest)(merged)
        : merged;

    return renderReference(ScholarlyArticle, props, options);
}

suite.concurrent("ScholarlyArticle.astro", () => {
    describe("content resolution", () => {
        test("renders title, publication, and author from props", async () => {
            const { $ } = await renderArticle({
                title: "Blood Oath Beneath the Ashen Moon",
                url: "https://example.com/blood-oath-beneath-the-ashen-moon",
                publication: "Chronicles of Severed Fate",
                author: "Reina Kurose",
            });

            expectLinkedTitle(
                $,
                "https://example.com/blood-oath-beneath-the-ashen-moon",
                "Blood Oath Beneath the Ashen Moon",
            );
            expectInlineMetaPlainText($, "Chronicles of Severed Fate");
            expect($("li").text()).toContain("Reina Kurose");
            expect($("span.text-muted-foreground").filter((_, node) => $(node).text() === "en"))
                .toHaveLength(1);
            expect($("span.text-muted-foreground").filter((_, node) => $(node).text() === "por"))
                .toHaveLength(1);
        });

        test("prefers meaningful title, publication, and author slot content over props", async () => {
            const { $ } = await renderArticle(
                {
                    title: "Base Chronicle",
                    url: "https://example.com/fated-article",
                    publication: "Base Record",
                    author: "Base Author",
                },
                {
                    slots: {
                        title:
                            "<strong data-slot=\"title\">The Crimson Thread of Our Last Promise</strong>",
                        publication: "<em data-slot=\"publication\">Archive of Broken Names</em>",
                        author: "<span data-slot=\"author\">Itsuki Amaya</span>",
                    },
                },
            );

            expectLinkedTitle(
                $,
                "https://example.com/fated-article",
                "The Crimson Thread of Our Last Promise",
            );
            expectSlotOverridesProp(
                $,
                "strong[data-slot='title']",
                "The Crimson Thread of Our Last Promise",
                "Base Chronicle",
            );
            expectSlotOverridesProp(
                $,
                "em[data-slot='publication']",
                "Archive of Broken Names",
                "Base Record",
            );
            expectSlotOverridesProp($, "span[data-slot='author']", "Itsuki Amaya", "Base Author");
        });

        test("falls back to props when title, publication, or author slots are empty", async () => {
            const { $ } = await renderArticle(
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

            expectLinkedTitle(
                $,
                "https://example.com/garden-vow",
                "The Garden Where the Vow Remained",
            );
            expectInlineMetaPlainText($, "Letters from the Hollow Dawn");
            expect($("li").text()).toContain("Mika Tohno");
        });
    });

    describe("page rendering", () => {
        test.each([
            [{ start: 7 }, "(p. 7)"],
            [{ start: 7, end: 12 }, "(pp. 7–12)"],
        ])("renders pages %j as %s", async (pages, expected) => {
            const { $ } = await renderArticle({
                title: "The House That Remembered Our Names",
                url: "https://example.com/remembered-names",
                pages,
            });

            expect($("li").text()).toContain(expected);
        });
    });

    describe("link rendering", () => {
        test("links the title to the article URL", async () => {
            const { $ } = await renderArticle({
                title: "Blood Oath Beneath the Ashen Moon",
                url: "https://example.com/blood-oath-beneath-the-ashen-moon",
            });

            expectLinkedTitle(
                $,
                "https://example.com/blood-oath-beneath-the-ashen-moon",
                "Blood Oath Beneath the Ashen Moon",
            );
        });

        test("links the publication when publicationUrl is present", async () => {
            const { $ } = await renderArticle({
                title: "Blood Oath Beneath the Ashen Moon",
                url: "https://example.com/blood-oath-beneath-the-ashen-moon",
                publication: "Chronicles of Severed Fate",
                publicationUrl: "https://example.com/publications/chronicles-of-severed-fate",
            });

            expectInlineMetaLink(
                $,
                "https://example.com/publications/chronicles-of-severed-fate",
                "Chronicles of Severed Fate",
            );
        });

        test("renders publication as plain text when publicationUrl is absent", async () => {
            const { $ } = await renderArticle({
                title: "The Last Heir of the Scarlet Estate",
                url: "https://example.com/last-heir-scarlet-estate",
                publication: "Chronicles of Severed Fate",
            });

            expectInlineMetaPlainText($, "Chronicles of Severed Fate");
        });

        test("fails when publicationUrl is provided without publication", async () => {
            await expect(
                renderArticle({
                    title: "Blood Oath Beneath the Ashen Moon",
                    url: "https://example.com/blood-oath-beneath-the-ashen-moon",
                    publicationUrl: "https://example.com/publications/chronicles-of-severed-fate",
                }),
            ).rejects.toThrow(ReferenceContractError);
        });
    });

    describe("optional content", () => {
        test("renders the description slot when it has meaningful content", async () => {
            const { $ } = await renderArticle(
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

            expectDescriptionPresence(
                $,
                "A fictional archival note on bloodlines, memory, and promises that outlive the people who made them.",
            );
        });

        test("omits the description section when no description is provided", async () => {
            const { $ } = await renderArticle({
                title: "The Orchard of Unspoken Farewells",
                url: "https://example.com/orchard-farewells",
            });

            expectDescriptionAbsent($);
        });

        test("omits publication and author labels when their fields are absent", async () => {
            const { $ } = await renderArticle({
                title: "The Orchard of Unspoken Farewells",
                url: "https://example.com/orchard-farewells",
            });

            expectMetaLabelAbsent($, "en");
            expectMetaLabelAbsent($, "por");
        });
    });

    describe("failures", () => {
        test("throws when no meaningful title source exists", async () => {
            await expect(
                renderArticle({
                    title: undefined,
                    url: "https://example.com/nameless-record",
                }),
            ).rejects.toThrow(MissingReferenceTitleError);
        });

        test("throws when the prop and slot title sources are both non-meaningful", async () => {
            await expect(
                renderArticle(
                    {
                        title: "   ",
                        url: "https://example.com/nameless-record",
                    },
                    {
                        slots: {
                            title: "<!-- empty -->",
                        },
                    },
                ),
            ).rejects.toThrow(MissingReferenceTitleError);
        });
    });
});
