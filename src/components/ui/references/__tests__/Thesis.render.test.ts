import { load } from "cheerio";
import { describe, expect, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import { MissingReferenceTitleError, ReferenceContractError } from "../ReferenceContractError";
import Thesis from "../Thesis.astro";

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
): Promise<string> {
    const render = await createAstroRenderer<ThesisProps>(Thesis);
    const merged = { ...BASE_PROPS, ...overrides };
    const props = merged.title === undefined
        ? (({ title: _title, ...rest }) => rest)(merged)
        : merged;

    return render(props, options);
}

async function renderAndParse(
    overrides: RenderOverrides = {},
    options?: RenderOptions,
) {
    const html = await renderThesis(overrides, options);

    return {
        html,
        $: load(html),
    };
}

describe.concurrent("Thesis.astro render", () => {
    describe("title contract", () => {
        test("renders a prop-backed title as exactly one link to url", async () => {
            const { $ } = await renderAndParse({
                title: "An Empirical Study on Bash Language Usage in Github",
                url: "http://hdl.handle.net/10012/17036",
            });
            const titleLink = $("a[href='http://hdl.handle.net/10012/17036']").first();

            expect($("a[href='http://hdl.handle.net/10012/17036']")).toHaveLength(1);
            expect(titleLink.attr("href")).toBe("http://hdl.handle.net/10012/17036");
            expect(titleLink.text().trim()).toBe("An Empirical Study on Bash Language Usage in Github");
        });

        test("renders a slot-backed title as exactly one link to url", async () => {
            const { $ } = await renderAndParse(
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
            const titleLink = $("a[href='https://example.com/thesis']").first();
            const titleSlot = $("strong[data-slot='title']");

            expect($("a[href='https://example.com/thesis']")).toHaveLength(1);
            expect(titleLink.attr("href")).toBe("https://example.com/thesis");
            expect(titleSlot).toHaveLength(1);
            expect(titleSlot.text()).toBe("Título desde slot");
            expect($("li").text()).not.toContain("Fallback title");
        });
    });

    describe("institution contract", () => {
        test("renders a linked institution only when institution and institutionUrl are both meaningful", async () => {
            const { $ } = await renderAndParse({
                title: "Thesis",
                url: "https://example.com/thesis",
                institution: "University of Waterloo",
                institutionUrl: "https://uwaterloo.ca/",
                author: "Quien investiga",
            });
            const institutionLink = $("a[href='https://uwaterloo.ca/']");

            expect(institutionLink).toHaveLength(1);
            expect(institutionLink.text().trim()).toBe("University of Waterloo");
            expect($("li").text()).toContain("Quien investiga");
        });

        test("renders plain institution text when institutionUrl is absent", async () => {
            const { $ } = await renderAndParse({
                title: "Thesis",
                url: "https://example.com/thesis",
                institution: "Institution base",
            });

            expect($("li").text()).toContain("Institution base");
            expect($("a").filter((_, node) => $(node).text().trim() === "Institution base")).toHaveLength(0);
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
            const { $ } = await renderAndParse(
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

            expect(slotInstitution).toHaveLength(1);
            expect(slotInstitution.text()).toBe("Institución desde slot");
            expect(slotInstitution.closest("a")).toHaveLength(0);
            expect($("a[href='https://example.com/institution']")).toHaveLength(0);
            expect($("li").text()).not.toContain("Institution base");
        });
    });

    describe("optional metadata omission", () => {
        test("omits the institution fragment when institution is absent", async () => {
            const { $ } = await renderAndParse({
                title: "Thesis",
                url: "https://example.com/thesis",
            });

            expect($("span.text-muted-foreground").filter((_, node) => $(node).text() === "en")).toHaveLength(0);
        });

        test("omits the author fragment when author is absent", async () => {
            const { $ } = await renderAndParse({
                title: "Thesis",
                url: "https://example.com/thesis",
                institution: "Institution base",
            });

            expect($("span.text-muted-foreground").filter((_, node) => $(node).text() === "por")).toHaveLength(0);
        });

        test("omits the description block when description slot is absent or non-meaningful", async () => {
            const withoutDescription = await renderAndParse({
                title: "Thesis",
                url: "https://example.com/thesis",
            });
            const emptyDescription = await renderAndParse(
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

            expect(withoutDescription.$("div.text-muted-foreground")).toHaveLength(0);
            expect(emptyDescription.$("div.text-muted-foreground")).toHaveLength(0);
        });

        test("renders author and description when meaningful", async () => {
            const { $ } = await renderAndParse(
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
            expect($("span.text-muted-foreground").filter((_, node) => $(node).text() === "por")).toHaveLength(1);
            expect($("div.text-muted-foreground")).toHaveLength(1);
            expect($("div.text-muted-foreground").text()).toContain("Descripción útil");
        });
    });

    describe("slot precedence and non-duplication", () => {
        test("prefers the title slot over the prop fallback without duplicating the fallback text", async () => {
            const { $ } = await renderAndParse(
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

            expect($("strong[data-slot='title']")).toHaveLength(1);
            expect($("a[href='https://example.com/thesis']")).toHaveLength(1);
            expect($("li").text()).toContain("Título desde slot");
            expect($("li").text()).not.toContain("Título base");
        });

        test("prefers the author slot over the prop fallback without duplicating the fallback text", async () => {
            const { $ } = await renderAndParse(
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

            expect($("em[data-slot='author']")).toHaveLength(1);
            expect($("li").text()).toContain("Autoría desde slot");
            expect($("li").text()).not.toContain("Autor base");
        });

        test("allows combined slot overrides without leaking fallback metadata or breaking the single title link contract", async () => {
            const { $ } = await renderAndParse(
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

            expect($("a[href='https://example.com/thesis']")).toHaveLength(1);
            expect($("a[href='https://example.com/thesis']").attr("href")).toBe("https://example.com/thesis");
            expect($("strong[data-slot='title']")).toHaveLength(1);
            expect($("em[data-slot='institution']")).toHaveLength(1);
            expect($("span[data-slot='author']")).toHaveLength(1);
            expect($("a[href='https://example.com/institution']")).toHaveLength(0);
            expect($("li").text()).not.toContain("Título base");
            expect($("li").text()).not.toContain("Institution base");
            expect($("li").text()).not.toContain("Autor base");
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
