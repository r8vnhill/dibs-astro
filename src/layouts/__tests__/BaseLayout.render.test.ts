/**
 * Characterizes the rendered root-layout contract for site maintainers and contributors.
 * Assertions intentionally target DOM behavior rather than implementation details.
 */
import BaseLayout from "$layouts/BaseLayout.astro";
import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, suite, test } from "vitest";

type BaseLayoutProps = {
    pageTitle: string;
    description?: string;
    pageMeta?: {
        type?: "website" | "article";
        canonicalUrl?: string;
        authors?: { name: string; url?: string }[];
        lastModified?: string;
        language?: string;
    };
    lang?: string;
};

const renderOptions = {
    request: new Request("https://example.com/contract/"),
    slots: { default: "<p data-fixture-content>Contenido de la página</p>" },
};

const articlePageProps: BaseLayoutProps = {
    pageTitle: "Diseño del contrato",
    description: "Descripción representativa",
    pageMeta: {
        type: "article",
        canonicalUrl: "https://example.com/articles/contract",
        authors: [{ name: "Ana Ejemplo", url: "https://example.com/ana" }],
        lastModified: "2026-08-25",
        language: "en-US",
    },
};

function expectDocumentStructure(document: Document) {
    const main = document.querySelector("main#main-content");
    const skipLink = document.querySelector("a[href^='#']");
    const bodyElements = Array.from(document.body.children);

    expect(document.querySelectorAll("html")).toHaveLength(1);
    expect(document.querySelectorAll("head")).toHaveLength(1);
    expect(document.querySelectorAll("body")).toHaveLength(1);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(main?.querySelector("[data-fixture-content]")?.textContent).toBe("Contenido de la página");
    expect(skipLink?.getAttribute("href")).toBe("#main-content");
    expect(document.getElementById(skipLink?.getAttribute("href")?.slice(1) ?? "")).toBe(main);
    expect(bodyElements.indexOf(document.querySelector("header") as Element)).toBeLessThan(
        bodyElements.indexOf(main as Element),
    );
    expect(bodyElements.indexOf(main as Element)).toBeLessThan(
        bodyElements.indexOf(document.querySelector("footer") as Element),
    );
}

function expectArticleMetadata(document: Document) {
    const structuredData = JSON.parse(
        document.querySelector("script[type='application/ld+json']")?.textContent ?? "null",
    ) as { "@type": string; headline: string; mainEntityOfPage: string };

    expect(document.title).toBe("Diseño del contrato | DIBS");
    expect(document.querySelector("meta[name='description']")?.getAttribute("content")).toBe(
        "Descripción representativa",
    );
    expect(document.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
        "https://example.com/articles/contract",
    );
    expect(document.querySelector("meta[name='citation_title']")?.getAttribute("content")).toBe(
        "Diseño del contrato | DIBS",
    );
    expect(structuredData).toMatchObject({
        "@type": "Article",
        headline: "Diseño del contrato | DIBS",
        mainEntityOfPage: "https://example.com/articles/contract",
    });
}

suite("given the DIBS root layout", () => {
    let renderBaseLayout: Awaited<ReturnType<typeof createAstroRenderer<BaseLayoutProps>>>;

    beforeAll(async () => {
        renderBaseLayout = await createAstroRenderer<BaseLayoutProps>(BaseLayout);
    });

    describe("when rendered with representative page content", () => {
        test("then it preserves the document structure and skip-link relationship", async () => {
            const html = await renderBaseLayout({ pageTitle: "Página representativa" }, renderOptions);
            expectDocumentStructure(new JSDOM(html).window.document);
        });
    });

    describe("when language inputs are resolved", () => {
        test.each(
            [
                ["en-US", "es", "en-US"],
                [" en-US ", "es", "en-US"],
                [undefined, "en", "en"],
                [undefined, " en ", "en"],
                [undefined, undefined, "es"],
                ["", "en", "es"],
                ["   ", "en", "es"],
                [undefined, "", "es"],
                [undefined, "   ", "es"],
            ] as const,
        )("then html lang resolves explicit=%j metadata=%j to %j", async (lang, metadataLanguage, expected) => {
            const html = await renderBaseLayout(
                {
                    pageTitle: "Idioma",
                    ...(lang === undefined ? {} : { lang }),
                    ...(metadataLanguage === undefined ? {} : { pageMeta: { language: metadataLanguage } }),
                },
                renderOptions,
            );

            expect(new JSDOM(html).window.document.documentElement.getAttribute("lang")).toBe(expected);
        });
    });

    describe("when DIBS metadata is supplied", () => {
        test("then page metadata is connected to document metadata", async () => {
            const html = await renderBaseLayout(articlePageProps, renderOptions);
            expectArticleMetadata(new JSDOM(html).window.document);
        });

        test("then omitted description keeps the current Head default", async () => {
            const html = await renderBaseLayout({ pageTitle: "Sin descripción" }, renderOptions);
            const description = new JSDOM(html).window.document.querySelector("meta[name='description']");

            expect(description?.getAttribute("content")).toBe("Diseño e Implementación de Bibliotecas de Software");
        });
    });

    describe("when site chrome is integrated", () => {
        test("then repository links and localized theme controls are exposed in the rendered DOM", async () => {
            const html = await renderBaseLayout({ pageTitle: "Chrome" }, renderOptions);
            const document = new JSDOM(html).window.document;

            expect(document.querySelector("header")).not.toBeNull();
            expect(document.querySelector("footer")).not.toBeNull();
            expect(document.querySelector("a[aria-label='Repositorio GitLab']")?.getAttribute("href")).toBe(
                "https://gitlab.com/r8vnhill/dibs-astro-website",
            );
            expect(document.querySelector("a[aria-label='Repositorio GitHub']")?.getAttribute("href")).toBe(
                "https://github.com/r8vnhill/dibs-astro",
            );
            expect(document.querySelector("button[title='Cambiar tema']")).not.toBeNull();
            expect(document.querySelector("button[title='Cambiar tema']")?.textContent).toContain("Auto");
        });
    });
});
