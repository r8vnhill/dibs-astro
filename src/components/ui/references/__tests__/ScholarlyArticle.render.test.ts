import { beforeEach, describe, expect, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import ScholarlyArticle from "../ScholarlyArticle.astro";

type ScholarlyArticleProps = {
    title?: string;
    url: string;
    publication?: string;
    pages?: { start: number; end?: number };
    author?: string;
};

let renderArticle: AstroRender<ScholarlyArticleProps>;

describe.concurrent("ScholarlyArticle.astro render", () => {
    beforeEach(async () => {
        renderArticle = await createAstroRenderer<ScholarlyArticleProps>(ScholarlyArticle);
    });

    test("renders props only", async () => {
        const html = await renderArticle({
            title: "Bash in the Wild",
            url: "https://doi.org/10.1145/3517193",
            publication: "TOSEM",
            author: "Quien investiga",
        });

        expect(html).toContain("Bash in the Wild");
        expect(html).toContain("TOSEM");
        expect(html).toContain("Quien investiga");
        expect(html).toContain(">en<");
        expect(html).toContain(">por<");
    });

    test("renders a single page and a page range", async () => {
        const singlePageHtml = await renderArticle({
            title: "Artículo",
            url: "https://example.com/article",
            pages: { start: 7 },
        });
        const rangeHtml = await renderArticle({
            title: "Artículo",
            url: "https://example.com/article",
            pages: { start: 12, end: 7 },
        });

        expect(singlePageHtml).toContain("(p. 7)");
        expect(rangeHtml).toContain("(pp. 7-12)");
    });

    test("prefers meaningful slot content over props", async () => {
        const html = await renderArticle(
            {
                title: "Título base",
                url: "https://example.com/article",
                publication: "Publicación base",
                author: "Autor base",
            },
            {
                slots: {
                    title: "Título desde slot",
                    publication: "Publicación desde slot",
                    author: "Autoría desde slot",
                },
            },
        );

        expect(html).toContain("Título desde slot");
        expect(html).toContain("Publicación desde slot");
        expect(html).toContain("Autoría desde slot");
        expect(html).not.toContain("Título base");
        expect(html).not.toContain("Publicación base");
        expect(html).not.toContain("Autor base");
    });

    test("falls back to props when slots are empty or comments only", async () => {
        const html = await renderArticle(
            {
                title: "Título base",
                url: "https://example.com/article",
                publication: "Publicación base",
                author: "Autor base",
            },
            {
                slots: {
                    title: "<!-- vacío -->",
                    publication: "   ",
                    author: "<!-- sin contenido -->",
                },
            },
        );

        expect(html).toContain("Título base");
        expect(html).toContain("Publicación base");
        expect(html).toContain("Autor base");
    });

    test("renders description when present and omits it when absent", async () => {
        const withDescription = await renderArticle(
            {
                title: "Artículo",
                url: "https://example.com/article",
            },
            {
                slots: {
                    description: "Descripción útil",
                },
            },
        );
        const withoutDescription = await renderArticle({
            title: "Artículo",
            url: "https://example.com/article",
        });

        expect(withDescription).toContain("Descripción útil");
        expect(withoutDescription).not.toContain("Descripción útil");
    });
});
