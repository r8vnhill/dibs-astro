import { describe, expect, suite, test } from "vitest";
import { type HeadEvidence, projectHead } from "../../../test-utils/head-evidence";
import {
    BASE_FONT_STYLESHEET,
    DEFAULT_CANONICAL_URL,
    DEFAULT_DESCRIPTION,
    DEFAULT_TITLE,
    FAVICON_PATH,
    GOOGLE_FONTS_ORIGIN,
    GOOGLE_FONTS_STATIC_ORIGIN,
    OPTIONAL_404_FONT_STYLESHEET,
    renderHead,
    SITEMAP_PATH,
    SOCIAL_IMAGE_PATH,
} from "./Head.evidence.support";

/**
 * Milestone 1 — freeze the current DIBS `Head` contract.
 *
 * Every case compares a {@link HeadEvidence} projection, never raw markup, so a
 * later migration onto `@ravenhill/astro-head` resource rendering can be proven
 * semantically equivalent without depending on Astro-generated formatting.
 *
 * Ownership annotations mark which projected values are package-owned (rendered
 * by `@ravenhill/astro-head`) versus DIBS-owned (resource selection appended by
 * `Head.astro`). Kaleido Star-inspired fixtures are used wherever DIBS defaults
 * are not the subject under characterization.
 */

async function evidence(props: Record<string, unknown>): Promise<HeadEvidence> {
    return projectHead(await renderHead(props));
}

/** DIBS-owned resource links, in the order `Head.astro` appends them. */
const DIBS_BASE_LINKS = [
    { rel: "icon", href: FAVICON_PATH, type: "image/png" },
    { rel: "preconnect", href: GOOGLE_FONTS_ORIGIN },
    { rel: "preconnect", href: GOOGLE_FONTS_STATIC_ORIGIN, crossorigin: "anonymous" },
    { rel: "stylesheet", href: BASE_FONT_STYLESHEET },
    { rel: "sitemap", href: SITEMAP_PATH },
];

suite("given a DIBS website page with no page props", () => {
    test("then the frozen head projection is recorded", async () => {
        expect(await evidence({})).toEqual({
            title: DEFAULT_TITLE,
            charset: "utf-8",
            // Package-owned: canonical falls back to the current page URL and is
            // normalized to an absolute href.
            canonical: DEFAULT_CANONICAL_URL,
            // DIBS-owned: which resources exist and their URLs.
            links: DIBS_BASE_LINKS,
            jsonLd: [],
            meta: {
                // Package-owned document basics.
                "name:viewport": ["width=device-width"],
                "name:description": [DEFAULT_DESCRIPTION],
                "name:generator": [expect.any(String)],
                // Package-owned social metadata; DIBS supplies the image policy.
                "property:og:title": [DEFAULT_TITLE],
                "property:og:type": ["website"],
                "property:og:url": [DEFAULT_CANONICAL_URL],
                "property:og:description": [DEFAULT_DESCRIPTION],
                "property:og:site_name": [DEFAULT_TITLE],
                "property:og:locale": ["es_CL"],
                "property:og:image": [SOCIAL_IMAGE_PATH],
                "name:twitter:card": ["summary_large_image"],
                "name:twitter:title": [DEFAULT_TITLE],
                "name:twitter:description": [DEFAULT_DESCRIPTION],
                "name:twitter:image": [SOCIAL_IMAGE_PATH],
                // Package-owned Dublin Core; article-only families stay absent.
                "name:DC.title": [DEFAULT_TITLE],
                "name:DC.identifier": [DEFAULT_CANONICAL_URL],
                "name:DC.language": ["es"],
                "name:DC.type": ["Web Page"],
            },
        });
    });
});

suite("given a DIBS article page", () => {
    const ARTICLE_TITLE = "Sora Naegino Audition Notes";
    const ARTICLE_DESCRIPTION = "Training notes for a new stage performer.";
    const ARTICLE_URL = "https://kaleido-stage.example/notes/audition/";

    test("then citation, Dublin Core, and JSON-LD record the article identity", async () => {
        const result = await evidence({
            title: ARTICLE_TITLE,
            description: ARTICLE_DESCRIPTION,
            url: ARTICLE_URL,
            pageMeta: {
                type: "article",
                canonicalUrl: ARTICLE_URL,
                language: "en",
                modifiedAt: "2026-03-22",
                authors: [{ name: "Sora Naegino", url: "https://kaleido-stage.example/staff/sora" }],
            },
        });

        // Package-owned: article metadata families.
        expect(result.meta["property:og:type"]).toEqual(["article"]);
        expect(result.meta["property:og:locale"]).toEqual(["en_GB"]);
        expect(result.meta["name:citation_title"]).toEqual([ARTICLE_TITLE]);
        expect(result.meta["name:citation_author"]).toEqual(["Sora Naegino"]);
        expect(result.meta["name:citation_date"]).toBeUndefined();
        expect(result.meta["name:citation_last_modified_date"]).toEqual(["2026-03-22"]);
        expect(result.meta["name:citation_public_url"]).toEqual([ARTICLE_URL]);
        expect(result.meta["name:citation_language"]).toEqual(["en"]);
        expect(result.meta["name:DC.type"]).toEqual(["Journal Article"]);
        expect(result.meta["name:DC.date"]).toEqual(["2026-03-22"]);
        expect(result.canonical).toBe(ARTICLE_URL);
        expect(result.jsonLd).toEqual([
            {
                "@context": "https://schema.org",
                "@type": "Article",
                headline: ARTICLE_TITLE,
                author: [{ "@type": "Person", name: "Sora Naegino", url: "https://kaleido-stage.example/staff/sora" }],
                inLanguage: "en",
                mainEntityOfPage: ARTICLE_URL,
                dateModified: "2026-03-22",
            },
        ]);
        // DIBS-owned: resource links are unchanged by article status.
        expect(result.links).toEqual(DIBS_BASE_LINKS);
    });

    test("then multiple authors are preserved in order across every family", async () => {
        const authors = [
            { name: "Junichi Sato", url: "https://kaleido-stage.example/staff/junichi-sato" },
            { name: "Reiko Yoshida" },
            { name: "Sora Naegino" },
        ];
        const result = await evidence({
            title: ARTICLE_TITLE,
            description: ARTICLE_DESCRIPTION,
            url: ARTICLE_URL,
            pageMeta: { type: "article", canonicalUrl: ARTICLE_URL, language: "en", authors },
        });

        expect(result.meta["name:citation_author"]).toEqual([
            "Junichi Sato",
            "Reiko Yoshida",
            "Sora Naegino",
        ]);
        expect(result.meta["name:DC.creator"]).toEqual([
            "Junichi Sato",
            "Reiko Yoshida",
            "Sora Naegino",
        ]);
        expect(result.jsonLd).toEqual([
            {
                "@context": "https://schema.org",
                "@type": "Article",
                headline: ARTICLE_TITLE,
                author: [
                    {
                        "@type": "Person",
                        name: "Junichi Sato",
                        url: "https://kaleido-stage.example/staff/junichi-sato",
                    },
                    { "@type": "Person", name: "Reiko Yoshida" },
                    { "@type": "Person", name: "Sora Naegino" },
                ],
                inLanguage: "en",
                mainEntityOfPage: ARTICLE_URL,
            },
        ]);
    });

    test("then a modified-only article omits publication dates but keeps modification dates", async () => {
        const result = await evidence({
            title: ARTICLE_TITLE,
            description: ARTICLE_DESCRIPTION,
            url: ARTICLE_URL,
            pageMeta: { type: "article", canonicalUrl: ARTICLE_URL, language: "en", modifiedAt: "2026-05-04" },
        });

        expect(result.meta["name:citation_date"]).toBeUndefined();
        expect(result.meta["name:citation_last_modified_date"]).toEqual(["2026-05-04"]);
        expect(result.meta["name:DC.date"]).toEqual(["2026-05-04"]);
        expect(result.jsonLd).toEqual([
            {
                "@context": "https://schema.org",
                "@type": "Article",
                headline: ARTICLE_TITLE,
                author: [],
                inLanguage: "en",
                mainEntityOfPage: ARTICLE_URL,
                dateModified: "2026-05-04",
            },
        ]);
    });
});

suite("given a page that does not declare a language", () => {
    test("then DIBS applies its Spanish fallback across locale and Dublin Core", async () => {
        const result = await evidence({
            title: "Layla Hamilton Journal",
            description: "Notes about discipline and trust on stage.",
            url: "https://kaleido-stage.example/journal/",
            pageMeta: { type: "article", canonicalUrl: "https://kaleido-stage.example/journal/" },
        });

        expect(result.meta["property:og:locale"]).toEqual(["es_CL"]);
        expect(result.meta["name:citation_language"]).toEqual(["es"]);
        expect(result.meta["name:DC.language"]).toEqual(["es"]);
    });
});

suite("given the DIBS 404 page", () => {
    test("then the optional Press Start 2P stylesheet is appended after the base resources", async () => {
        const result = await evidence({ include404Font: true });

        expect(result.links).toEqual([
            ...DIBS_BASE_LINKS,
            { rel: "stylesheet", href: OPTIONAL_404_FONT_STYLESHEET },
        ]);
    });

    test("then omitting the flag leaves only the base resources", async () => {
        const result = await evidence({});

        expect(result.links).toEqual(DIBS_BASE_LINKS);
        expect(result.links.map((link) => link.href)).not.toContain(OPTIONAL_404_FONT_STYLESHEET);
    });
});

describe("current DIBS language-to-Open-Graph-locale mapping", () => {
    test.each([
        { language: "es", expected: "es_CL" },
        { language: "es-CL", expected: "es_CL" },
        { language: "en", expected: "en_GB" },
        { language: "en-GB", expected: "en_GB" },
        { language: "zz", expected: "es_CL" },
    ])("maps $language to $expected", async ({ language, expected }) => {
        const result = await evidence({
            title: "X",
            description: "Y",
            url: "https://kaleido-stage.example/x/",
            pageMeta: { type: "article", language },
        });

        expect(result.meta["property:og:locale"]).toEqual([expected]);
    });
});

describe("current DIBS type precedence", () => {
    test.each([
        { typeProp: "website", pageMetaType: "article", expected: "article" },
        { typeProp: "article", pageMetaType: "website", expected: "website" },
    ])(
        "uses pageMeta.type ($pageMetaType) over the type prop ($typeProp)",
        async ({ typeProp, pageMetaType, expected }) => {
            const result = await evidence({
                title: "X",
                description: "Y",
                url: "https://kaleido-stage.example/x/",
                type: typeProp,
                pageMeta: { type: pageMetaType },
            });

            expect(result.meta["property:og:type"]).toEqual([expected]);
        },
    );
});
