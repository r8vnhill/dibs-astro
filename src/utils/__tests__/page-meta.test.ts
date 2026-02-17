import {
    buildHeadPageMeta,
    type PageMeta,
} from "../page-meta";

describe.concurrent("buildHeadPageMeta", () => {
    test("builds citation metadata for article pages", () => {
        const pageMeta: PageMeta = {
            type: "article",
            canonicalUrl: "https://dibs.ravenhill.cl/notes/example/",
            authors: [
                { name: "Ignacio Slater-Munoz" },
                { name: "Proyecto DIBS", url: "https://dibs.ravenhill.cl/" },
            ],
            lastModified: "2026-02-17",
            language: "es",
        };

        const result = buildHeadPageMeta({
            title: "Leccion de ejemplo",
            url: "https://dibs.ravenhill.cl/notes/example/",
            pageMeta,
        });

        expect(result.type).toBe("article");
        expect(result.canonicalUrl).toBe("https://dibs.ravenhill.cl/notes/example/");
        expect(result.citationAuthors).toEqual(["Ignacio Slater-Munoz", "Proyecto DIBS"]);
        expect(result.citationDate).toBe("2026-02-17");
        expect(result.citationLastModifiedDate).toBe("2026-02-17");
        expect(result.citationLanguage).toBe("es");
        expect(result.jsonLd?.["@type"]).toBe("Article");
        expect(result.jsonLd?.dateModified).toBe("2026-02-17");
    });

    test("omits citation date fields when lastModified is missing", () => {
        const result = buildHeadPageMeta({
            title: "Leccion sin fecha",
            url: "https://dibs.ravenhill.cl/notes/no-date/",
            pageMeta: {
                type: "article",
                canonicalUrl: "https://dibs.ravenhill.cl/notes/no-date/",
                authors: [{ name: "Proyecto DIBS" }],
            },
        });

        expect(result.citationDate).toBeUndefined();
        expect(result.citationLastModifiedDate).toBeUndefined();
    });

    test("normalizes trimmed authors and language, filtering blank names", () => {
        const result = buildHeadPageMeta({
            title: "Leccion con autoria",
            url: "https://dibs.ravenhill.cl/notes/authors/",
            pageMeta: {
                type: "article",
                authors: [
                    { name: "  Ada Lovelace  " },
                    { name: "   " },
                ],
                language: "  es-CL  ",
            },
        });

        expect(result.citationAuthors).toEqual(["Ada Lovelace"]);
        expect(result.citationLanguage).toBe("es-CL");
    });

    test("keeps website defaults when pageMeta is absent", () => {
        const result = buildHeadPageMeta({
            title: "Inicio",
            url: "https://dibs.ravenhill.cl/",
        });

        expect(result.type).toBe("website");
        expect(result.citationAuthors).toEqual([]);
        expect(result.jsonLd).toBeUndefined();
    });
});
