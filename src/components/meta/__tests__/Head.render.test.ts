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

import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeEach, describe, expect, test } from "vitest";
import { WEBSITE_PRIMARY_AUTHOR } from "~/data/site";
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
const OG_TYPE_ARTICLE = "<meta property=\"og:type\" content=\"article\">";
const OG_TYPE_WEBSITE = "<meta property=\"og:type\" content=\"website\">";
const CITATION_AUTHOR_NAME = "name=\"citation_author\"";
const CITATION_DATE_NAME = "name=\"citation_date\"";
const CITATION_LAST_MODIFIED_NAME = "name=\"citation_last_modified_date\"";

/**
 * Shared container instance.
 *
 * A fresh container is created before each test to avoid cross-test state leakage.
 */
let container: Awaited<ReturnType<typeof AstroContainer.create>>;

/**
 * Renders the {@link Head} component to an HTML string.
 *
 * @param props Props passed to the Astro component.
 * @returns Rendered HTML string.
 */
async function renderHead(props: Record<string, unknown>): Promise<string> {
    return container.renderToString(Head, { props });
}

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
     * Creates a new Astro rendering container before each test.
     *
     * This prevents:
     * - Shared state between tests
     * - Side effects across concurrent runs
     */
    beforeEach(async () => {
        container = await AstroContainer.create();
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

        /**
         * No citation metadata for non-article pages.
         */
        expect(html).not.toContain(CITATION_AUTHOR_NAME);
        expect(html).not.toContain(CITATION_DATE_NAME);
        expect(html).not.toContain(CITATION_LAST_MODIFIED_NAME);

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
});
