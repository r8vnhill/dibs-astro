/**
 * @file Head.render.test.ts
 *
 * Integration tests for the {@link Head} Astro component.
 *
 * These tests render the component using Astro's experimental container API and assert against the
 * generated HTML output.
 *
 * ## Scope
 *
 * This suite verifies:
 *
 * - Open Graph (`og:*`) metadata generation.
 * - Citation meta tags for academic indexing.
 * - Conditional JSON-LD output for article pages.
 * - Correct fallback behavior when `pageMeta` is absent.
 *
 * ## Testing Strategy
 *
 * - Uses `AstroContainer.renderToString` to render the component in isolation.
 * - Asserts against generated HTML using string checks and simple pattern counts.
 * - Extracts and parses JSON-LD payload to validate structured data.
 *
 * **These are integration-level tests**: They ensure the component wiring between `Head.astro` and
 * `buildHeadPageMeta` behaves correctly.
 */

import { beforeEach, describe, expect, test } from "vitest";
import { createAstroRenderer, type AstroRender } from "../../../test-utils/astro-render";
import { WEBSITE_PRIMARY_AUTHOR } from "../../../data/site";
import Head from "../Head.astro";

const ARTICLE_URL = "https://dibs.ravenhill.cl/notes/example/";
const WEBSITE_URL = "https://dibs.ravenhill.cl/";
const DATE_LAST_MODIFIED = "2026-02-17";
const LANGUAGE_ES = "es";
const ARTICLE_TITLE = "Lección de ejemplo";
const ARTICLE_DESCRIPTION = "Descripción de prueba";
const WEBSITE_TITLE = "Inicio";
const WEBSITE_DESCRIPTION = "Página principal";
const SECONDARY_AUTHOR = "Proyecto DIBS";
const JSONLD_CONTEXT = "https://schema.org";
const JSONLD_TYPE_ARTICLE = "Article";
const CANONICAL_LINK_REL = "rel=\"canonical\"";
const OG_TYPE_ARTICLE = "<meta property=\"og:type\" content=\"article\">";
const OG_TYPE_WEBSITE = "<meta property=\"og:type\" content=\"website\">";
const CITATION_AUTHOR_NAME = "name=\"citation_author\"";
const CITATION_DATE_NAME = "name=\"citation_date\"";
const CITATION_LAST_MODIFIED_NAME = "name=\"citation_last_modified_date\"";
const CITATION_TITLE_NAME = "name=\"citation_title\"";
const CITATION_PUBLIC_URL_NAME = "name=\"citation_public_url\"";
const CITATION_LANGUAGE_NAME = "name=\"citation_language\"";
const OG_LOCALE_ES = "<meta property=\"og:locale\" content=\"es_CL\">";
const OG_LOCALE_EN = "<meta property=\"og:locale\" content=\"en_GB\">";
const SOCIAL_IMAGE_PATH = "/online-library.png";
const DC_TYPE_WEBPAGE = "<meta name=\"DC.type\" content=\"Web Page\">";
const DC_TYPE_JOURNAL_ARTICLE = "<meta name=\"DC.type\" content=\"Journal Article\">";

let renderHead: AstroRender<Record<string, unknown>>;

/**
 * Extracts and parses the JSON-LD script block from the rendered HTML.
 *
 * This helper ensures that JSON-LD validation is performed structurally rather than via fragile
 * substring checks.
 *
 * @param html Rendered HTML string.
 * @returns Parsed JSON object or `undefined` if not found or invalid.
 */
function extractJsonLd(html: string): Record<string, unknown> | undefined {
    const match = html.match(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
    );

    if (!match) return undefined;

    const payload = match[1];
    if (!payload) return undefined;

    try {
        return JSON.parse(payload.trim()) as Record<string, unknown>;
    } catch {
        return undefined;
    }
}

describe.concurrent("Head.astro render", () => {
    /**
     * Creates a new Astro renderer before each test.
     *
     * This prevents:
     * - Shared state between tests
     * - Side effects across concurrent runs
     */
    beforeEach(async () => {
        renderHead = await createAstroRenderer<Record<string, unknown>>(Head);
    });

    test("renders citation and article metadata for lesson pages", async () => {
        const html = await renderHead({
            title: ARTICLE_TITLE,
            description: ARTICLE_DESCRIPTION,
            url: ARTICLE_URL,
            pageMeta: {
                type: "article",
                canonicalUrl: ARTICLE_URL,
                authors: [
                    { name: WEBSITE_PRIMARY_AUTHOR.name },
                    { name: SECONDARY_AUTHOR },
                ],
                lastModified: DATE_LAST_MODIFIED,
                language: LANGUAGE_ES,
            },
        });

        // ## Open Graph metadata ##
        expect(
            html.match(new RegExp(OG_TYPE_ARTICLE, "g"))?.length ?? 0,
        ).toBe(1);

        expect(html).toContain(`<meta property="og:url" content="${ARTICLE_URL}">`);
        expect(html).toContain(OG_LOCALE_ES);
        expect(html).toContain(`<meta property="og:image" content="${SOCIAL_IMAGE_PATH}">`);
        expect(html).toContain(`<meta name="twitter:image" content="${SOCIAL_IMAGE_PATH}">`);
        expect(html).toContain(`<link rel="canonical" href="${ARTICLE_URL}">`);
        expect(html).toContain(CANONICAL_LINK_REL);

        // ## Citation metadata ##
        expect(html).toContain(`<meta name="citation_title" content="${ARTICLE_TITLE}">`);
        expect(html).toContain(
            `<meta name="citation_author" content="${WEBSITE_PRIMARY_AUTHOR.name}">`,
        );
        expect(html).toContain(`<meta name="citation_author" content="${SECONDARY_AUTHOR}">`);
        expect(html.match(new RegExp(CITATION_AUTHOR_NAME, "g"))?.length ?? 0).toBe(2);
        expect(html).toContain(
            `<meta name="citation_date" content="${DATE_LAST_MODIFIED}">`,
        );
        expect(html).toContain(
            `<meta name="citation_last_modified_date" content="${DATE_LAST_MODIFIED}">`,
        );
        expect(html).toContain(
            `<meta name="citation_public_url" content="${ARTICLE_URL}">`,
        );
        expect(html).toContain(
            `<meta name="citation_language" content="${LANGUAGE_ES}">`,
        );
        expect(html).toContain(DC_TYPE_JOURNAL_ARTICLE);
        expect(html).toContain(`<meta name="DC.identifier" content="${ARTICLE_URL}">`);

        // ## JSON-LD structured data ##
        const jsonLd = extractJsonLd(html);

        expect(jsonLd).toBeDefined();
        expect(jsonLd?.["@context"]).toBe(JSONLD_CONTEXT);
        expect(jsonLd?.["@type"]).toBe(JSONLD_TYPE_ARTICLE);
        expect(jsonLd?.dateModified).toBe(DATE_LAST_MODIFIED);
        expect(jsonLd?.mainEntityOfPage).toBe(ARTICLE_URL);
    });

    test("keeps website defaults when page meta is absent", async () => {
        const html = await renderHead({
            title: WEBSITE_TITLE,
            description: WEBSITE_DESCRIPTION,
            url: WEBSITE_URL,
        });

        /**
         * Should default to website Open Graph type.
         */
        expect(
            html.match(new RegExp(OG_TYPE_WEBSITE, "g"))?.length ?? 0,
        ).toBe(1);

        expect(html).toContain(
            `<meta property="og:url" content="${WEBSITE_URL}">`,
        );
        expect(html).toContain(`<link rel="canonical" href="${WEBSITE_URL}">`);
        expect(html).toContain(DC_TYPE_WEBPAGE);
        expect(html).toContain(`<meta name="DC.identifier" content="${WEBSITE_URL}">`);

        /**
         * No citation metadata for non-article pages.
         */
        expect(html).not.toContain(CITATION_TITLE_NAME);
        expect(html).not.toContain(CITATION_AUTHOR_NAME);
        expect(html).not.toContain(CITATION_DATE_NAME);
        expect(html).not.toContain(CITATION_LAST_MODIFIED_NAME);
        expect(html).not.toContain(CITATION_PUBLIC_URL_NAME);
        expect(html).not.toContain(CITATION_LANGUAGE_NAME);

        /**
         * No JSON-LD for website pages.
         */
        expect(extractJsonLd(html)).toBeUndefined();
    });

    /**
     * Data-driven test to verify correct Open Graph type selection.
     */
    test.each([
        {
            name: "uses article og:type when pageMeta.type is article",
            props: {
                title: "X",
                description: "Y",
                url: "https://dibs.ravenhill.cl/x/",
                pageMeta: { type: "article" },
            },
            expected: OG_TYPE_ARTICLE,
        },
        {
            name: "defaults to website og:type when pageMeta is missing",
            props: {
                title: "X",
                description: "Y",
                url: "https://dibs.ravenhill.cl/x/",
            },
            expected: OG_TYPE_WEBSITE,
        },
    ])("$name", async ({ props, expected }) => {
        const html = await renderHead(props);
        expect(html).toContain(expected);
    });

    test("maps language to Open Graph locale", async () => {
        const html = await renderHead({
            title: ARTICLE_TITLE,
            description: ARTICLE_DESCRIPTION,
            url: ARTICLE_URL,
            pageMeta: {
                type: "article",
                language: "en-GB",
            },
        });

        expect(html).toContain(OG_LOCALE_EN);
    });
});
