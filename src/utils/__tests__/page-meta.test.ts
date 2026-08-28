import { buildHeadPageMeta } from "@ravenhill/astro-head";
import fc from "fast-check";
import { expect, suite, test } from "vitest";
import { WEBSITE_PRIMARY_AUTHOR } from "../../data/site";
import { toDibsPageMetadata, type DibsPageMetadataInput } from "../dibs-page-metadata";
import type { PageMeta } from "../page-meta";

const pageUrl = "https://dibs.ravenhill.cl/notes/example/";
const baseInput: DibsPageMetadataInput = {
    title: "Lección de ejemplo",
    description: "Descripción de prueba",
    url: pageUrl,
};

function buildMetadata(input: DibsPageMetadataInput) {
    return buildHeadPageMeta(toDibsPageMetadata(input));
}

suite("given DIBS content metadata", () => {
    test("then the adapter preserves article metadata through the published package", () => {
        const result = buildMetadata({
            ...baseInput,
            pageMeta: {
                type: "article",
                canonicalUrl: pageUrl,
                authors: [
                    { name: WEBSITE_PRIMARY_AUTHOR.name },
                    { name: "Proyecto DIBS", url: "https://dibs.ravenhill.cl/" },
                ],
                modifiedAt: "2026-02-17",
                language: "es",
            },
        });

        expect(result).toMatchObject({
            type: "article",
            canonicalUrl: pageUrl,
            language: "es",
            authors: [
                { name: WEBSITE_PRIMARY_AUTHOR.name },
                { name: "Proyecto DIBS", url: "https://dibs.ravenhill.cl/" },
            ],
            modifiedAt: "2026-02-17",
            jsonLd: {
                headline: "Lección de ejemplo",
                dateModified: "2026-02-17",
            },
        });
    });

    test("then missing metadata keeps the DIBS website defaults", () => {
        const result = buildMetadata(baseInput);

        expect(result).toEqual({
            type: "website",
            canonicalUrl: pageUrl,
            language: "es",
            authors: [],
        });
        expect(result.jsonLd).toBeUndefined();
    });

    test("then the adapter preserves the resolved Open Graph locale", () => {
        expect(toDibsPageMetadata({ ...baseInput, openGraphLocale: "es_CL" }).openGraphLocale).toBe("es_CL");
    });

    test("then blank language values use the DIBS Spanish fallback", () => {
        expect(buildMetadata({ ...baseInput, pageMeta: { language: "   " } }).language).toBe("es");
    });

    test("then one DIBS modification date populates only the package modification field", () => {
        const result = buildMetadata({
            ...baseInput,
            pageMeta: { type: "article", modifiedAt: " 2026-02-17 " },
        });

        expect(result.modifiedAt).toBe("2026-02-17");
        expect(result.publishedAt).toBeUndefined();
        expect(result.jsonLd?.datePublished).toBeUndefined();
        expect(result.jsonLd?.dateModified).toBe("2026-02-17");
    });

    test.each([
        {
            name: "invalid",
            canonicalUrl: "not a url",
        },
        {
            name: "relative",
            canonicalUrl: "/notes/other/",
        },
    ])("then the package falls back to the current URL for a $name canonical candidate", ({ canonicalUrl }) => {
        expect(buildMetadata({ ...baseInput, pageMeta: { type: "article", canonicalUrl } }).canonicalUrl).toBe(pageUrl);
    });

    test("then package normalization keeps authors trimmed and non-empty", () => {
        const result = buildMetadata({
            ...baseInput,
            pageMeta: {
                type: "article",
                authors: [{ name: "  Ada Lovelace  " }, { name: "   " }],
                language: "  es-CL  ",
            },
        });

        expect(result.authors).toEqual([{ name: "Ada Lovelace" }]);
        expect(result.language).toBe("es-CL");
    });

    test("then package normalization satisfies author and type invariants for arbitrary content metadata", () => {
        const authorArbitrary = fc.record({
            name: fc.string(),
            url: fc.option(fc.string(), { nil: undefined }),
        });
        const rawPageMetaArbitrary = fc.option(fc.record({
            type: fc.constantFrom<"website" | "article">("website", "article"),
            canonicalUrl: fc.option(fc.string(), { nil: undefined }),
            authors: fc.array(authorArbitrary, { maxLength: 8 }),
            modifiedAt: fc.option(fc.string(), { nil: undefined }),
            language: fc.option(fc.string(), { nil: undefined }),
        }), { nil: undefined });

        fc.assert(fc.property(rawPageMetaArbitrary, (rawPageMeta) => {
            const pageMeta: PageMeta | undefined = rawPageMeta
                ? {
                    type: rawPageMeta.type,
                    ...(rawPageMeta.canonicalUrl !== undefined
                        ? { canonicalUrl: rawPageMeta.canonicalUrl }
                        : {}),
                    authors: rawPageMeta.authors.map((author) => ({
                        name: author.name,
                        ...(author.url !== undefined ? { url: author.url } : {}),
                    })),
                    ...(rawPageMeta.modifiedAt !== undefined
                        ? { modifiedAt: rawPageMeta.modifiedAt }
                        : {}),
                    ...(rawPageMeta.language !== undefined ? { language: rawPageMeta.language } : {}),
                }
                : undefined;
            const result = buildMetadata({
                ...baseInput,
                ...(pageMeta ? { pageMeta } : {}),
            });

            expect(result.language.trim().length).toBeGreaterThan(0);
            for (const author of result.authors) {
                expect(author.name).toBe(author.name.trim());
                expect(author.name.length).toBeGreaterThan(0);
            }
            expect(Boolean(result.jsonLd)).toBe((pageMeta?.type ?? "website") === "article");
        }));
    });
});
