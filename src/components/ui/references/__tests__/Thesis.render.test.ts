import { describe, expect, test } from "vitest";
import { type AstroRender } from "../../../../test-utils/astro-render";
import { MissingReferenceTitleError, ReferenceContractError } from "../ReferenceContractError";
import Thesis from "../Thesis.astro";
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

type ThesisProps = {
    title?: string;
    url: string;
    institution?: string;
    institutionUrl?: string;
    author?: string;
};

type RenderOptions = Parameters<AstroRender<ThesisProps>>[1];
type RenderOverrides = Omit<Partial<ThesisProps>, "title"> & { title?: string | undefined };

const BASE_PROPS = {
    title: "Base thesis title",
    url: "https://example.com/thesis",
} satisfies ThesisProps;

async function renderThesis(
    overrides: RenderOverrides = {},
    options?: RenderOptions,
) {
    const merged = { ...BASE_PROPS, ...overrides };
    const props = merged.title === undefined
        ? (({ title: _title, ...rest }) => rest)(merged)
        : merged;

    return renderReference(Thesis, props, options);
}

describe.concurrent("Thesis.astro render", () => {
    describe("title contract", () => {
        test("renders a prop-backed title as exactly one link to url", async () => {
            const { $ } = await renderThesis({
                title: "An Empirical Study on Bash Language Usage in Github",
                url: "http://hdl.handle.net/10012/17036",
            });

            expectLinkedTitle(
                $,
                "http://hdl.handle.net/10012/17036",
                "An Empirical Study on Bash Language Usage in Github",
            );
        });

        test("renders a slot-backed title as exactly one link to url", async () => {
            const { $ } = await renderThesis(
                {
                    title: "Fallback title",
                    url: "https://example.com/thesis",
                },
                {
                    slots: {
                        title: "<strong data-slot=\"title\">Título desde slot</strong>",
                    },
                },
            );

            expectLinkedTitle($, "https://example.com/thesis", "Título desde slot");
            expectSlotOverridesProp(
                $,
                "strong[data-slot='title']",
                "Título desde slot",
                "Fallback title",
            );
        });
    });

    describe("institution contract", () => {
        test("renders a linked institution only when institution and institutionUrl are both meaningful", async () => {
            const { $ } = await renderThesis({
                title: "Thesis",
                url: "https://example.com/thesis",
                institution: "University of Waterloo",
                institutionUrl: "https://uwaterloo.ca/",
                author: "Quien investiga",
            });

            expectInlineMetaLink($, "https://uwaterloo.ca/", "University of Waterloo");
            expect($("li").text()).toContain("Quien investiga");
        });

        test("renders plain institution text when institutionUrl is absent", async () => {
            const { $ } = await renderThesis({
                title: "Thesis",
                url: "https://example.com/thesis",
                institution: "Institution base",
            });

            expectInlineMetaPlainText($, "Institution base");
        });

        test("fails when institutionUrl is provided without institution", async () => {
            await expect(
                renderThesis({
                    title: "Thesis",
                    url: "https://example.com/thesis",
                    institutionUrl: "https://example.com/institution",
                }),
            ).rejects.toThrow(ReferenceContractError);
        });

        test("respects the institution slot without wrapping it automatically or leaking prop fallbacks", async () => {
            const { $ } = await renderThesis(
                {
                    title: "Thesis",
                    url: "https://example.com/thesis",
                    institution: "Institution base",
                    institutionUrl: "https://example.com/institution",
                },
                {
                    slots: {
                        institution: "<em data-slot=\"institution\">Institución desde slot</em>",
                    },
                },
            );
            const slotInstitution = $("em[data-slot='institution']");

            expectSlotOverridesProp(
                $,
                "em[data-slot='institution']",
                "Institución desde slot",
                "Institution base",
            );
            expect(slotInstitution.closest("a")).toHaveLength(0);
            expect($("a[href='https://example.com/institution']")).toHaveLength(0);
        });
    });

    describe("optional metadata omission", () => {
        test("omits the institution fragment when institution is absent", async () => {
            const { $ } = await renderThesis({
                title: "Thesis",
                url: "https://example.com/thesis",
            });

            expectMetaLabelAbsent($, "en");
        });

        test("omits the author fragment when author is absent", async () => {
            const { $ } = await renderThesis({
                title: "Thesis",
                url: "https://example.com/thesis",
                institution: "Institution base",
            });

            expectMetaLabelAbsent($, "por");
        });

        test("omits the description block when description slot is absent or non-meaningful", async () => {
            const withoutDescription = await renderThesis({
                title: "Thesis",
                url: "https://example.com/thesis",
            });
            const emptyDescription = await renderThesis(
                {
                    title: "Thesis",
                    url: "https://example.com/thesis",
                },
                {
                    slots: {
                        description: "<!-- empty -->",
                    },
                },
            );

            expectDescriptionAbsent(withoutDescription.$);
            expectDescriptionAbsent(emptyDescription.$);
        });

        test("renders author and description when meaningful", async () => {
            const { $ } = await renderThesis(
                {
                    title: "Thesis",
                    url: "https://example.com/thesis",
                    institution: "Institution base",
                    author: "Autor base",
                },
                {
                    slots: {
                        description: "Descripción útil",
                    },
                },
            );

            expect($("li").text()).toContain("Institution base");
            expect($("li").text()).toContain("Autor base");
            expect($("span.text-muted-foreground").filter((_, node) => $(node).text() === "por"))
                .toHaveLength(1);
            expectDescriptionPresence($, "Descripción útil");
        });
    });

    describe("slot precedence and non-duplication", () => {
        test("prefers the title slot over the prop fallback without duplicating the fallback text", async () => {
            const { $ } = await renderThesis(
                {
                    title: "Título base",
                    url: "https://example.com/thesis",
                },
                {
                    slots: {
                        title: "<strong data-slot=\"title\">Título desde slot</strong>",
                    },
                },
            );

            expectLinkedTitle($, "https://example.com/thesis", "Título desde slot");
            expectSlotOverridesProp(
                $,
                "strong[data-slot='title']",
                "Título desde slot",
                "Título base",
            );
        });

        test("prefers the author slot over the prop fallback without duplicating the fallback text", async () => {
            const { $ } = await renderThesis(
                {
                    title: "Thesis",
                    url: "https://example.com/thesis",
                    author: "Autor base",
                },
                {
                    slots: {
                        author: "<em data-slot=\"author\">Autoría desde slot</em>",
                    },
                },
            );

            expectSlotOverridesProp(
                $,
                "em[data-slot='author']",
                "Autoría desde slot",
                "Autor base",
            );
        });

        test("allows combined slot overrides without leaking fallback metadata or breaking the single title link contract", async () => {
            const { $ } = await renderThesis(
                {
                    title: "Título base",
                    url: "https://example.com/thesis",
                    institution: "Institution base",
                    institutionUrl: "https://example.com/institution",
                    author: "Autor base",
                },
                {
                    slots: {
                        title: "<strong data-slot=\"title\">Título desde slot</strong>",
                        institution: "<em data-slot=\"institution\">Institución desde slot</em>",
                        author: "<span data-slot=\"author\">Autoría desde slot</span>",
                    },
                },
            );

            expectLinkedTitle($, "https://example.com/thesis", "Título desde slot");
            expectSlotOverridesProp(
                $,
                "strong[data-slot='title']",
                "Título desde slot",
                "Título base",
            );
            expectSlotOverridesProp(
                $,
                "em[data-slot='institution']",
                "Institución desde slot",
                "Institution base",
            );
            expectSlotOverridesProp(
                $,
                "span[data-slot='author']",
                "Autoría desde slot",
                "Autor base",
            );
            expect($("a[href='https://example.com/institution']")).toHaveLength(0);
        });
    });

    describe("failure modes", () => {
        test("throws MissingReferenceTitleError when no meaningful title source exists", async () => {
            await expect(
                renderThesis({
                    title: undefined,
                    url: "https://example.com/thesis",
                }),
            ).rejects.toThrow(MissingReferenceTitleError);
        });

        test("throws MissingReferenceTitleError for a whitespace-only prop title", async () => {
            await expect(
                renderThesis({
                    title: "   ",
                    url: "https://example.com/thesis",
                }),
            ).rejects.toThrow(MissingReferenceTitleError);
        });

        test("throws MissingReferenceTitleError when the title slot is non-meaningful and no usable prop fallback exists", async () => {
            await expect(
                renderThesis(
                    {
                        title: undefined,
                        url: "https://example.com/thesis",
                    },
                    {
                        slots: {
                            title: "<!-- empty -->",
                        },
                    },
                ),
            ).rejects.toThrow(MissingReferenceTitleError);
        });

        test("throws MissingReferenceTitleError when both prop and slot title sources are non-meaningful", async () => {
            await expect(
                renderThesis(
                    {
                        title: "   ",
                        url: "https://example.com/thesis",
                    },
                    {
                        slots: {
                            title: "   ",
                        },
                    },
                ),
            ).rejects.toThrow(MissingReferenceTitleError);
        });
    });
});
