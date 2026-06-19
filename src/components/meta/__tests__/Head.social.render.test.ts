import { describe, expect, test } from "vitest";
import {
    ARTICLE_DESCRIPTION,
    ARTICLE_TITLE,
    ARTICLE_URL,
    DEFAULT_TITLE,
    getLinkAttribute,
    getMetaContentByName,
    getMetaContentByProperty,
    OG_LOCALE_EN,
    OG_TYPE_ARTICLE,
    OG_TYPE_WEBSITE,
    renderHead,
    SOCIAL_IMAGE_PATH,
} from "./Head.render.support";

describe.concurrent("Head.astro social metadata render", () => {
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

    /**
     * Cycle 3 — Characterize social metadata, locale mapping, and type precedence.
     *
     * These tests lock behavior that is easy to break during component parameterization:
     * Open Graph / Twitter output, `pageMeta.type` precedence over the `type` prop, and the
     * current language-to-Open-Graph-locale mapping.
     *
     * The social image asserted here (`SOCIAL_IMAGE_PATH`) is current DIBS host coupling: the
     * component always emits `site.HEAD.DEFAULT_SOCIAL_IMAGE`, which a later phase will replace
     * with explicit host config.
     */
    describe("social metadata, locale mapping, and type precedence", () => {
        const KALEIDO_TITLE = "Layla Hamilton Training Journal";
        const KALEIDO_DESCRIPTION = "Notes about discipline, performance, and trust on stage.";
        const KALEIDO_URL = "https://kaleido-stage.example/journal/";

        test("renders Open Graph and Twitter metadata from the effective page metadata", async () => {
            const html = await renderHead({
                title: KALEIDO_TITLE,
                description: KALEIDO_DESCRIPTION,
                url: KALEIDO_URL,
                pageMeta: { type: "article", canonicalUrl: KALEIDO_URL },
            });

            // Open Graph reflects the effective page metadata and shared canonical URL.
            expect(getMetaContentByProperty(html, "og:title")).toBe(KALEIDO_TITLE);
            expect(getMetaContentByProperty(html, "og:description")).toBe(KALEIDO_DESCRIPTION);
            expect(getMetaContentByProperty(html, "og:url")).toBe(KALEIDO_URL);
            expect(getMetaContentByProperty(html, "og:type")).toBe("article");
            // og:site_name and og:image remain current DIBS host coupling.
            expect(getMetaContentByProperty(html, "og:site_name")).toBe(DEFAULT_TITLE);
            expect(getMetaContentByProperty(html, "og:image")).toBe(SOCIAL_IMAGE_PATH);

            // Twitter card mirrors the same effective metadata.
            expect(getMetaContentByName(html, "twitter:card")).toBe("summary_large_image");
            expect(getMetaContentByName(html, "twitter:title")).toBe(KALEIDO_TITLE);
            expect(getMetaContentByName(html, "twitter:description")).toBe(KALEIDO_DESCRIPTION);
            expect(getMetaContentByName(html, "twitter:image")).toBe(SOCIAL_IMAGE_PATH);

            // Social metadata shares the resolved canonical URL.
            expect(getLinkAttribute(html, "canonical", "href")).toBe(KALEIDO_URL);
        });

        test("uses pageMeta.type over the type prop when both are provided", async () => {
            const articleViaPageMeta = await renderHead({
                title: KALEIDO_TITLE,
                description: KALEIDO_DESCRIPTION,
                url: KALEIDO_URL,
                type: "website",
                pageMeta: { type: "article" },
            });
            expect(getMetaContentByProperty(articleViaPageMeta, "og:type")).toBe("article");

            const websiteViaPageMeta = await renderHead({
                title: KALEIDO_TITLE,
                description: KALEIDO_DESCRIPTION,
                url: KALEIDO_URL,
                type: "article",
                pageMeta: { type: "website" },
            });
            expect(getMetaContentByProperty(websiteViaPageMeta, "og:type")).toBe("website");
        });

        /**
         * Data-driven characterization of the current locale mapping.
         *
         * Current behavior maps Spanish variants to `es_CL`, English variants to `en_GB`, and
         * unknown languages back to `es_CL`. A later phase may improve this mapping.
         */
        test.each([
            { language: "es", expectedLocale: "es_CL" },
            { language: "es-CL", expectedLocale: "es_CL" },
            { language: "en", expectedLocale: "en_GB" },
            { language: "en-GB", expectedLocale: "en_GB" },
            { language: "zz", expectedLocale: "es_CL" },
        ])("maps $language to $expectedLocale", async ({ language, expectedLocale }) => {
            const html = await renderHead({
                title: ARTICLE_TITLE,
                description: ARTICLE_DESCRIPTION,
                url: ARTICLE_URL,
                pageMeta: { type: "article", language },
            });

            expect(getMetaContentByProperty(html, "og:locale")).toBe(expectedLocale);
        });
    });
});
