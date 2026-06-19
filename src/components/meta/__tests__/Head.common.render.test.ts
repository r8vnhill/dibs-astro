import { describe, expect, test } from "vitest";
import {
    BASE_FONT_STYLESHEET,
    countElements,
    DEFAULT_CANONICAL_URL,
    DEFAULT_DESCRIPTION,
    DEFAULT_TITLE,
    FAVICON_ICO_PATH,
    FAVICON_PNG_PATH,
    getLinkAttribute,
    getMetaContentByName,
    getMetaContentByProperty,
    getTitleText,
    GOOGLE_FONTS_ORIGIN,
    GOOGLE_FONTS_STATIC_ORIGIN,
    OPTIONAL_404_FONT_STYLESHEET,
    renderHead,
    SITEMAP_PATH,
    WEBSITE_DESCRIPTION,
    WEBSITE_TITLE,
    WEBSITE_URL,
} from "./Head.render.support";

describe.concurrent("Head.astro common metadata render", () => {
    test("exposes metadata through queryable rendered tags", async () => {
        const html = await renderHead({
            title: WEBSITE_TITLE,
            description: WEBSITE_DESCRIPTION,
            url: WEBSITE_URL,
        });

        expect(getMetaContentByName(html, "description")).toBe(WEBSITE_DESCRIPTION);
        expect(getMetaContentByProperty(html, "og:url")).toBe(WEBSITE_URL);
        expect(getLinkAttribute(html, "canonical", "href")).toBe(WEBSITE_URL);
        expect(countElements(html, "meta[property=\"og:type\"]")).toBe(1);
    });

    describe("current DIBS host coupling", () => {
        test("renders the current default title, description, and canonical URL when page props are omitted", async () => {
            const html = await renderHead({});

            expect(getTitleText(html)).toBe(DEFAULT_TITLE);
            expect(getMetaContentByName(html, "description")).toBe(DEFAULT_DESCRIPTION);
            expect(getLinkAttribute(html, "canonical", "href")).toBe(DEFAULT_CANONICAL_URL);
            expect(getMetaContentByProperty(html, "og:url")).toBe(DEFAULT_CANONICAL_URL);
        });

        test("renders favicon, sitemap, generator, and viewport tags for every page", async () => {
            const html = await renderHead({});

            expect(
                countElements(html, `link[rel="icon"][href="${FAVICON_ICO_PATH}"][type="image/x-icon"]`),
            ).toBe(1);
            expect(
                countElements(html, `link[rel="icon"][href="${FAVICON_PNG_PATH}"][type="image/png"]`),
            ).toBe(1);
            expect(
                countElements(html, `link[rel="sitemap"][href="${SITEMAP_PATH}"]`),
            ).toBe(1);
            expect(getMetaContentByName(html, "viewport")).toBe("width=device-width");
            expect(getMetaContentByName(html, "generator")).toBeDefined();
            expect(getMetaContentByName(html, "generator")).not.toBe("");
        });

        test("renders base font links for every page", async () => {
            const html = await renderHead({});

            expect(
                countElements(html, `link[rel="preconnect"][href="${GOOGLE_FONTS_ORIGIN}"]`),
            ).toBe(1);
            expect(
                countElements(
                    html,
                    `link[rel="preconnect"][href="${GOOGLE_FONTS_STATIC_ORIGIN}"][crossorigin="anonymous"]`,
                ),
            ).toBe(1);
            expect(
                countElements(html, `link[rel="stylesheet"][href="${BASE_FONT_STYLESHEET}"]`),
            ).toBe(1);
        });

        /**
         * `include404Font` is current app-specific behavior. Later extraction will generalize it
         * into host-provided optional font links without changing this rendered output.
         */
        test.each([
            { name: "omits the optional 404 font by default", props: {}, expectedCount: 0 },
            {
                name: "renders the optional 404 font when include404Font is true",
                props: { include404Font: true },
                expectedCount: 1,
            },
        ])("$name", async ({ props, expectedCount }) => {
            const html = await renderHead(props);

            expect(
                countElements(html, `link[rel="stylesheet"][href="${BASE_FONT_STYLESHEET}"]`),
            ).toBe(1);
            expect(
                countElements(html, `link[rel="stylesheet"][href="${OPTIONAL_404_FONT_STYLESHEET}"]`),
            ).toBe(expectedCount);
        });
    });
});
