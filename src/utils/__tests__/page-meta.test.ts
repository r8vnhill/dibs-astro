import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { WEBSITE_PRIMARY_AUTHOR } from "../../data/site";
import { buildHeadPageMeta, type PageMeta } from "../page-meta";

/**
 * @file buildHeadPageMeta.test.ts
 *
 * Tests for {@link buildHeadPageMeta}.
 *
 * This suite mixes:
 *
 * - **Example-based tests** for clear, user-facing behaviors (article vs website, JSON-LD shape).
 * - **Data-driven tests (DDT)** via `test.each` for canonical URL and language edge cases.
 * - **Property-based tests (PBT)** via `fast-check` to exercise normalization invariants across
 *   many random inputs.
 *
 * ## Why property-based testing here?
 *
 * `buildHeadPageMeta` performs *normalization* (trimming, filtering, fallback selection). These
 * are ideal for PBT because we can assert invariants such as:
 *
 * - Returned author names are never blank and are always trimmed.
 * - Returned language is never blank.
 * - JSON-LD presence matches page type (`article` -> defined, `website` -> undefined).
 *
 * ## fast-check notes
 *
 * - The arbitraries generate a broad range of strings, including empty and whitespace-only inputs.
 * - We generate a *raw* shape (`RawPageMeta`) and then convert it into the library type
 *   (`PageMeta`) to keep the test inputs aligned with real-world "optional field" patterns
 *   (frontmatter/CMS).
 */

/**
 * Raw test-only representation of {@link PageMeta}.
 *
 * This shape is intentionally explicit about optionality (`undefined`), so the arbitraries can
 * freely omit fields without having to conform to `PageMeta`'s structural constraints.
 *
 * In other words: this represents the "messy" inputs we expect in the wild.
 */
interface RawPageMeta {
    /**
     * Page kind. Used to decide whether JSON-LD is emitted.
     */
    type: "website" | "article";

    /**
     * Preferred canonical URL candidate.
     *
     * If invalid (e.g. relative URL, garbage text), `buildHeadPageMeta` should fall back to the
     * `url` passed as input.
     */
    canonicalUrl: string | undefined;

    /**
     * Raw author list. Names may include whitespace-only entries.
     */
    authors: Array<{ name: string; url: string | undefined }> | undefined;

    /**
     * Last modified date (free-form string here; production code may enforce ISO-8601).
     */
    lastModified: string | undefined;

    /**
     * Language tag (BCP 47 recommended).
     */
    language: string | undefined;

    /**
     * Optional change log. Not currently asserted in output, but included so PBT can ensure it
     * doesn't crash or influence unrelated fields.
     */
    changes:
        | Array<{ hash: string; date: string; author: string; subject: string }>
        | undefined;
}

/**
 * Converts {@link RawPageMeta} into a {@link PageMeta} value.
 *
 * This helper exists so PBT can generate `undefined` fields freely while still passing a valid
 * `PageMeta` into {@link buildHeadPageMeta}.
 *
 * ## Behavior
 *
 * - If `raw` is `undefined`, returns `undefined` (meaning the caller omits `pageMeta`).
 * - For each field, only includes it in the resulting object if it is not `undefined`.
 *
 * @param raw Raw optional input shape.
 * @returns A {@link PageMeta} object, or `undefined` if `raw` is missing.
 */
function toPageMeta(raw?: RawPageMeta): PageMeta | undefined {
    if (!raw) return undefined;

    return {
        type: raw.type,
        ...(raw.canonicalUrl !== undefined ? { canonicalUrl: raw.canonicalUrl } : {}),
        ...(raw.authors !== undefined
            ? {
                authors: raw.authors.map((author) => ({
                    name: author.name,
                    ...(author.url !== undefined ? { url: author.url } : {}),
                })),
            }
            : {}),
        ...(raw.lastModified !== undefined ? { lastModified: raw.lastModified } : {}),
        ...(raw.language !== undefined ? { language: raw.language } : {}),
        ...(raw.changes !== undefined ? { changes: raw.changes } : {}),
    };
}

describe.concurrent("buildHeadPageMeta", () => {
    test("builds citation metadata and JSON-LD for article pages", () => {
        const pageMeta: PageMeta = {
            type: "article",
            canonicalUrl: "https://dibs.ravenhill.cl/notes/example/",
            authors: [
                { name: WEBSITE_PRIMARY_AUTHOR.name },
                { name: "Proyecto DIBS", url: "https://dibs.ravenhill.cl/" },
            ],
            lastModified: "2026-02-17",
            language: "es",
        };

        const result = buildHeadPageMeta({
            title: " Lección de ejemplo ",
            url: "https://dibs.ravenhill.cl/notes/example/",
            pageMeta,
        });

        expect(result.type).toBe("article");
        expect(result.canonicalUrl).toBe("https://dibs.ravenhill.cl/notes/example/");
        expect(result.citationAuthors).toEqual([
            WEBSITE_PRIMARY_AUTHOR.name,
            "Proyecto DIBS",
        ]);
        expect(result.citationDate).toBe("2026-02-17");
        expect(result.citationLastModifiedDate).toBe("2026-02-17");
        expect(result.citationLanguage).toBe("es");

        expect(result.jsonLd?.["@context"]).toBe("https://schema.org");
        expect(result.jsonLd?.["@type"]).toBe("Article");
        expect(result.jsonLd?.headline).toBe("Lección de ejemplo");
        expect(result.jsonLd?.inLanguage).toBe("es");
        expect(result.jsonLd?.mainEntityOfPage).toBe(
            "https://dibs.ravenhill.cl/notes/example/",
        );
        expect(result.jsonLd?.dateModified).toBe("2026-02-17");
        expect(result.jsonLd?.author).toEqual([
            { "@type": "Person", name: WEBSITE_PRIMARY_AUTHOR.name },
            {
                "@type": "Person",
                name: "Proyecto DIBS",
                url: "https://dibs.ravenhill.cl/",
            },
        ]);
    });

    test("omits citation date fields when lastModified is missing", () => {
        const result = buildHeadPageMeta({
            title: "Lección sin fecha",
            url: "https://dibs.ravenhill.cl/notes/no-date/",
            pageMeta: {
                type: "article",
                canonicalUrl: "https://dibs.ravenhill.cl/notes/no-date/",
                authors: [{ name: "Proyecto DIBS" }],
            },
        });

        expect(result.citationDate).toBeUndefined();
        expect(result.citationLastModifiedDate).toBeUndefined();
        expect(result.jsonLd?.dateModified).toBeUndefined();
    });

    test("normalizes trimmed authors and language, filtering blank names", () => {
        const result = buildHeadPageMeta({
            title: "Lección con autoria",
            url: "https://dibs.ravenhill.cl/notes/authors/",
            pageMeta: {
                type: "article",
                authors: [{ name: "  Ada Lovelace  " }, { name: "   " }],
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
        expect(result.canonicalUrl).toBe("https://dibs.ravenhill.cl/");
        expect(result.citationAuthors).toEqual([]);
        expect(result.citationLanguage).toBe("es");
        expect(result.jsonLd).toBeUndefined();
    });

    test.each([
        {
            name: "uses fallback URL when canonicalUrl is invalid",
            url: " https://dibs.ravenhill.cl/notes/fallback/ ",
            canonicalUrl: "not a url",
            expected: "https://dibs.ravenhill.cl/notes/fallback/",
        },
        {
            name: "uses fallback URL when canonicalUrl is relative",
            url: " https://dibs.ravenhill.cl/notes/fallback-relative/ ",
            canonicalUrl: "/notes/x/",
            expected: "https://dibs.ravenhill.cl/notes/fallback-relative/",
        },
        {
            name: "prefers canonicalUrl when valid",
            url: "https://dibs.ravenhill.cl/notes/fallback-preference/",
            canonicalUrl: "https://dibs.ravenhill.cl/notes/canonical/",
            expected: "https://dibs.ravenhill.cl/notes/canonical/",
        },
    ])("$name", ({ url, canonicalUrl, expected }) => {
        const result = buildHeadPageMeta({
            title: "Canonical test",
            url,
            pageMeta: {
                type: "article",
                canonicalUrl,
            },
        });

        expect(result.canonicalUrl).toBe(expected);
        expect(result.jsonLd?.mainEntityOfPage).toBe(expected);
    });

    test.each([
        {
            name: "defaults language to es when blank",
            pageMeta: { language: "   " } satisfies PageMeta,
            expected: "es",
        },
        {
            name: "keeps explicit language",
            pageMeta: { language: "en-GB" } satisfies PageMeta,
            expected: "en-GB",
        },
    ])("$name", ({ pageMeta, expected }) => {
        const result = buildHeadPageMeta({
            title: "Lang",
            url: "https://dibs.ravenhill.cl/notes/lang/",
            pageMeta: { type: "website", ...pageMeta },
        });

        expect(result.citationLanguage).toBe(expected);
    });

    test("property: authors are always trimmed/non-empty and jsonLd follows page type", () => {
        /**
         * Arbitrary for raw author entries.
         *
         * - Name is any string (including whitespace-only).
         * - URL is either a string or omitted (`undefined`).
         */
        const authorArbitrary = fc.record({
            name: fc.string(),
            url: fc.option(fc.string(), { nil: undefined }),
        });

        /**
         * Arbitrary for raw PageMeta.
         *
         * We model "optional fields" by allowing `undefined` for each field and then converting
         * to {@link PageMeta} via {@link toPageMeta}.
         */
        const pageMetaArbitrary = fc.option(
            fc.record({
                type: fc.constantFrom<"website" | "article">("website", "article"),
                canonicalUrl: fc.option(fc.string(), { nil: undefined }),
                authors: fc.array(authorArbitrary, { maxLength: 8 }),
                lastModified: fc.option(fc.string(), { nil: undefined }),
                language: fc.option(fc.string(), { nil: undefined }),
                changes: fc.option(
                    fc.array(
                        fc.record({
                            hash: fc.string(),
                            date: fc.string(),
                            author: fc.string(),
                            subject: fc.string(),
                        }),
                        { maxLength: 3 },
                    ),
                    { nil: undefined },
                ),
            }),
            { nil: undefined },
        );

        /**
         * Property: output is always "clean".
         *
         * - All `citationAuthors` entries are trimmed and non-empty.
         * - Language is never blank after trimming.
         * - JSON-LD exists iff the (effective) page type is `"article"`.
         */
        fc.assert(
            fc.property(pageMetaArbitrary, (rawPageMeta) => {
                const pageMeta = toPageMeta(rawPageMeta);

                const result = buildHeadPageMeta({
                    title: "Property test",
                    url: "https://dibs.ravenhill.cl/notes/property/",
                    ...(pageMeta !== undefined ? { pageMeta } : {}),
                });

                for (const author of result.citationAuthors) {
                    expect(author).toBe(author.trim());
                    expect(author.length).toBeGreaterThan(0);
                }

                expect(result.citationLanguage.trim().length).toBeGreaterThan(0);

                if ((pageMeta?.type ?? "website") === "article") {
                    expect(result.jsonLd).toBeDefined();
                } else {
                    expect(result.jsonLd).toBeUndefined();
                }
            }),
        );
    });
});
