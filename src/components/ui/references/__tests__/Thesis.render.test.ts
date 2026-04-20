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

describe.concurrent("Thesis.astro render", () => {
    test("renders a linked institution when institutionUrl is provided", async () => {
        const html = await renderThesis({
            title: "An Empirical Study on Bash Language Usage in Github",
            url: "http://hdl.handle.net/10012/17036",
            institution: "University of Waterloo",
            institutionUrl: "https://uwaterloo.ca/",
            author: "Quien investiga",
        });

        expect(html).toContain("An Empirical Study on Bash Language Usage in Github");
        expect(html).toContain("href=\"https://uwaterloo.ca/\"");
        expect(html).toMatch(/>\s*University of Waterloo\s*<\/a>/);
        expect(html).toContain("Quien investiga");
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

        expect(html).toContain("data-slot=\"institution\"");
        expect(html).toContain("Institución desde slot");
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

        expect(html).toContain("Institution base");
        expect(html).not.toContain("href=\"undefined\"");
        expect(html).toContain("Autor base");
        expect(html).toContain("Descripción útil");
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

        expect(html).toContain("Título desde slot");
        expect(html).toContain("Autoría desde slot");
        expect(html).not.toContain("Título base");
        expect(html).not.toContain("Autor base");
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
