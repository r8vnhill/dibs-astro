import { load } from "cheerio";
import { describe, expect, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
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

const parse = (html: string) => load(html);

describe.concurrent("Thesis.astro render", () => {
    test("renders a linked institution when institutionUrl is provided", async () => {
        const html = await renderThesis({
            title: "An Empirical Study on Bash Language Usage in Github",
            url: "http://hdl.handle.net/10012/17036",
            institution: "University of Waterloo",
            institutionUrl: "https://uwaterloo.ca/",
            author: "Quien investiga",
        });
        const $ = parse(html);
        const titleLink = $("li a").first();
        const institutionLink = $("li a[href='https://uwaterloo.ca/']");

        expect(titleLink).toHaveLength(1);
        expect(titleLink.attr("href")).toBe("http://hdl.handle.net/10012/17036");
        expect(titleLink.text()).toContain("An Empirical Study on Bash Language Usage in Github");
        expect(institutionLink).toHaveLength(1);
        expect(institutionLink.text().trim()).toBe("University of Waterloo");
        expect($("li").text()).toContain("Quien investiga");
    });

    test("respects the institution slot without wrapping it automatically", async () => {
        const html = await renderThesis(
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
        const $ = parse(html);
        const slotInstitution = $("em[data-slot='institution']");

        expect(slotInstitution).toHaveLength(1);
        expect(slotInstitution.text()).toBe("Institución desde slot");
        expect(slotInstitution.closest("a")).toHaveLength(0);
        expect($("a[href='https://example.com/institution']")).toHaveLength(0);
    });

    test("renders plain institution text, author, and description when present", async () => {
        const html = await renderThesis(
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
        const $ = parse(html);
        const listItem = $("li").first();
        const metadataText = listItem.text();
        const description = $("div.text-muted-foreground").first();

        expect(metadataText).toContain("Institution base");
        expect(metadataText).toContain("Autor base");
        expect(description.text()).toContain("Descripción útil");
        expect($("a[href='undefined']")).toHaveLength(0);
        expect($("a").filter((_, node) => $(node).text().trim() === "Institution base")).toHaveLength(0);
    });

    test("prefers title and author slots over prop fallbacks", async () => {
        const html = await renderThesis(
            {
                title: "Título base",
                url: "https://example.com/thesis",
                author: "Autor base",
            },
            {
                slots: {
                    title: "<strong>Título desde slot</strong>",
                    author: "<em>Autoría desde slot</em>",
                },
            },
        );
        const $ = parse(html);
        const titleSlot = $("strong").first();
        const authorSlot = $("em").filter((_, node) => $(node).text().includes("Autoría desde slot"));

        expect(titleSlot).toHaveLength(1);
        expect(titleSlot.text()).toBe("Título desde slot");
        expect(authorSlot).toHaveLength(1);
        expect($("li").text()).toContain("Título desde slot");
        expect($("li").text()).toContain("Autoría desde slot");
        expect($("li").text()).not.toContain("Título base");
        expect($("li").text()).not.toContain("Autor base");
    });

    test("throws when no meaningful title source exists", async () => {
        await expect(
            renderThesis({
                title: undefined,
                url: "https://example.com/thesis",
            }),
        ).rejects.toThrow(/title/i);
    });
});
