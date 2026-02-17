import { experimental_AstroContainer as AstroContainer } from "astro/container";
import Head from "../Head.astro";

describe.concurrent("Head.astro render", () => {
    test("renders citation and article metadata for lesson pages", async () => {
        const container = await AstroContainer.create();
        const html = await container.renderToString(Head, {
            props: {
                title: "Leccion de ejemplo",
                description: "Descripcion de prueba",
                url: "https://dibs.ravenhill.cl/notes/example/",
                pageMeta: {
                    type: "article",
                    canonicalUrl: "https://dibs.ravenhill.cl/notes/example/",
                    authors: [
                        { name: "Ignacio Slater-Munoz" },
                        { name: "Proyecto DIBS" },
                    ],
                    lastModified: "2026-02-17",
                    language: "es",
                },
            },
        });

        expect(html).toContain('<meta property="og:type" content="article">');
        expect(html).toContain(
            '<meta property="og:url" content="https://dibs.ravenhill.cl/notes/example/">',
        );
        expect(html).toContain('<meta name="citation_title" content="Leccion de ejemplo">');
        expect(html).toContain('<meta name="citation_author" content="Ignacio Slater-Munoz">');
        expect(html).toContain('<meta name="citation_author" content="Proyecto DIBS">');
        expect(html).toContain('<meta name="citation_date" content="2026-02-17">');
        expect(html).toContain('<meta name="citation_last_modified_date" content="2026-02-17">');
        expect(html).toContain(
            '<meta name="citation_public_url" content="https://dibs.ravenhill.cl/notes/example/">',
        );
        expect(html).toContain('<meta name="citation_language" content="es">');
        expect(html).toContain('"@type":"Article"');
        expect(html).toContain('"dateModified":"2026-02-17"');
    });

    test("keeps website defaults when page meta is absent", async () => {
        const container = await AstroContainer.create();
        const html = await container.renderToString(Head, {
            props: {
                title: "Inicio",
                description: "Pagina principal",
                url: "https://dibs.ravenhill.cl/",
            },
        });

        expect(html).toContain('<meta property="og:type" content="website">');
        expect(html).toContain('<meta property="og:url" content="https://dibs.ravenhill.cl/">');
        expect(html).not.toContain('name="citation_date"');
        expect(html).not.toContain('name="citation_last_modified_date"');
        expect(html).not.toContain("application/ld+json");
    });
});
