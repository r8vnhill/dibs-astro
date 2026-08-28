import { describe, expect, test } from "vitest";
import {
    ARTICLE_DESCRIPTION,
    ARTICLE_TITLE,
    ARTICLE_URL,
    CANONICAL_LINK_REL,
    CITATION_AUTHOR_NAME,
    CITATION_DATE_NAME,
    CITATION_LANGUAGE_NAME,
    CITATION_LAST_MODIFIED_NAME,
    CITATION_PUBLIC_URL_NAME,
    CITATION_TITLE_NAME,
    countElements,
    DATE_MODIFIED_AT,
    DC_TYPE_JOURNAL_ARTICLE,
    DC_TYPE_WEBPAGE,
    extractJsonLd,
    FAVICON_PATH,
    getMetaContentByName,
    getMetaContentByProperty,
    JSONLD_CONTEXT,
    JSONLD_TYPE_ARTICLE,
    LANGUAGE_ES,
    OG_LOCALE_ES,
    renderHead,
    SECONDARY_AUTHOR,
    SOCIAL_IMAGE_PATH,
    WEBSITE_DESCRIPTION,
    WEBSITE_PRIMARY_AUTHOR,
    WEBSITE_TITLE,
    WEBSITE_URL,
} from "./Head.render.support";

describe.concurrent("Head.astro article metadata render", () => {
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
                modifiedAt: DATE_MODIFIED_AT,
                language: LANGUAGE_ES,
            },
        });

        // ## Open Graph metadata ##
        expect(
            countElements(html, "meta[property=\"og:type\"][content=\"article\"]"),
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
        expect(html).not.toContain(CITATION_DATE_NAME);
        expect(html).toContain(
            `<meta name="citation_last_modified_date" content="${DATE_MODIFIED_AT}">`,
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
        expect(jsonLd?.datePublished).toBeUndefined();
        expect(jsonLd?.dateModified).toBe(DATE_MODIFIED_AT);
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
        expect(getMetaContentByProperty(html, "og:type")).toBe("website");

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

    test("renders the shared DIBS site icon", async () => {
        const html = await renderHead({
            title: WEBSITE_TITLE,
            description: WEBSITE_DESCRIPTION,
            url: WEBSITE_URL,
        });

        expect(
            countElements(html, `link[rel="icon"][href="${FAVICON_PATH}"][type="image/png"]`),
        ).toBe(1);
    });

    /**
     * Cycle 5 — Characterize article-only metadata.
     *
     * These tests lock the conditional metadata that distinguishes article pages from website
     * pages: Highwire/Zotero citation tags, Dublin Core creator/date/type tags, and the Schema.org
     * JSON-LD script. They also prove website pages omit article-only tags, so a later extraction
     * cannot accidentally leak article metadata onto non-article pages.
     *
     * Kaleido Star-inspired fixtures are used where DIBS defaults are not required, keeping the
     * characterization independent from the host site's data.
     */
    describe("article-only metadata", () => {
        const ARTICLE_FIXTURE_TITLE = "Sora Naegino Practice Notes";
        const ARTICLE_FIXTURE_DESCRIPTION = "A short article about preparing for a stage audition.";
        const ARTICLE_FIXTURE_URL = "https://kaleido-stage.example/notes/practice/";
        const ARTICLE_FIXTURE_LANGUAGE = "en";
        const ARTICLE_FIXTURE_MODIFIED_AT = "2026-03-21";
        const ARTICLE_FIXTURE_AUTHORS = [
            { name: "Junichi Sato", url: "https://kaleido-stage.example/staff/junichi-sato" },
            { name: "Reiko Yoshida", url: "https://kaleido-stage.example/staff/reiko-yoshida" },
        ];

        test("Head emits article citation tags, Dublin Core tags, and JSON-LD for article pages", async () => {
            const html = await renderHead({
                title: ARTICLE_FIXTURE_TITLE,
                description: ARTICLE_FIXTURE_DESCRIPTION,
                url: ARTICLE_FIXTURE_URL,
                pageMeta: {
                    type: "article",
                    canonicalUrl: ARTICLE_FIXTURE_URL,
                    authors: ARTICLE_FIXTURE_AUTHORS,
                    modifiedAt: ARTICLE_FIXTURE_MODIFIED_AT,
                    language: ARTICLE_FIXTURE_LANGUAGE,
                },
            });

            // ## Citation tags ##
            expect(getMetaContentByName(html, "citation_title")).toBe(ARTICLE_FIXTURE_TITLE);
            expect(countElements(html, "meta[name=\"citation_author\"]")).toBe(
                ARTICLE_FIXTURE_AUTHORS.length,
            );
            expect(getMetaContentByName(html, "citation_date")).toBeUndefined();
            expect(getMetaContentByName(html, "citation_last_modified_date")).toBe(
                ARTICLE_FIXTURE_MODIFIED_AT,
            );
            expect(getMetaContentByName(html, "citation_public_url")).toBe(ARTICLE_FIXTURE_URL);
            expect(getMetaContentByName(html, "citation_language")).toBe(ARTICLE_FIXTURE_LANGUAGE);

            // ## Dublin Core tags ##
            expect(getMetaContentByName(html, "DC.type")).toBe("Journal Article");
            expect(countElements(html, "meta[name=\"DC.creator\"]")).toBe(
                ARTICLE_FIXTURE_AUTHORS.length,
            );
            expect(getMetaContentByName(html, "DC.date")).toBe(ARTICLE_FIXTURE_MODIFIED_AT);
            expect(getMetaContentByName(html, "DC.identifier")).toBe(ARTICLE_FIXTURE_URL);

            // ## JSON-LD structured data ##
            const jsonLd = extractJsonLd(html);
            expect(jsonLd?.["@type"]).toBe(JSONLD_TYPE_ARTICLE);
            expect(jsonLd?.headline).toBe(ARTICLE_FIXTURE_TITLE);
            expect(jsonLd?.inLanguage).toBe(ARTICLE_FIXTURE_LANGUAGE);
            expect(jsonLd?.mainEntityOfPage).toBe(ARTICLE_FIXTURE_URL);
            expect(jsonLd?.datePublished).toBeUndefined();
            expect(jsonLd?.dateModified).toBe(ARTICLE_FIXTURE_MODIFIED_AT);
        });

        test("Head omits article citation tags and JSON-LD for website pages", async () => {
            const html = await renderHead({
                title: ARTICLE_FIXTURE_TITLE,
                description: ARTICLE_FIXTURE_DESCRIPTION,
                url: ARTICLE_FIXTURE_URL,
                pageMeta: {
                    type: "website",
                    canonicalUrl: ARTICLE_FIXTURE_URL,
                    authors: ARTICLE_FIXTURE_AUTHORS,
                    modifiedAt: ARTICLE_FIXTURE_MODIFIED_AT,
                    language: ARTICLE_FIXTURE_LANGUAGE,
                },
            });

            // Article-only citation tags are absent on website pages.
            expect(countElements(html, "meta[name=\"citation_title\"]")).toBe(0);
            expect(countElements(html, "meta[name=\"citation_author\"]")).toBe(0);
            expect(countElements(html, "meta[name=\"citation_date\"]")).toBe(0);
            expect(countElements(html, "meta[name=\"citation_last_modified_date\"]")).toBe(0);
            expect(countElements(html, "meta[name=\"citation_public_url\"]")).toBe(0);
            expect(countElements(html, "meta[name=\"citation_language\"]")).toBe(0);

            // Dublin Core type degrades to a generic web page, with no JSON-LD emitted.
            expect(getMetaContentByName(html, "DC.type")).toBe("Web Page");
            expect(extractJsonLd(html)).toBeUndefined();
        });

        test("Head preserves author URLs in rendered JSON-LD for article pages", async () => {
            const html = await renderHead({
                title: ARTICLE_FIXTURE_TITLE,
                description: ARTICLE_FIXTURE_DESCRIPTION,
                url: ARTICLE_FIXTURE_URL,
                pageMeta: {
                    type: "article",
                    canonicalUrl: ARTICLE_FIXTURE_URL,
                    authors: ARTICLE_FIXTURE_AUTHORS,
                    language: ARTICLE_FIXTURE_LANGUAGE,
                },
            });

            const jsonLd = extractJsonLd(html);
            const authors = jsonLd?.author as Array<Record<string, unknown>> | undefined;

            expect(authors).toHaveLength(ARTICLE_FIXTURE_AUTHORS.length);
            ARTICLE_FIXTURE_AUTHORS.forEach((expectedAuthor, index) => {
                expect(authors?.[index]?.["@type"]).toBe("Person");
                expect(authors?.[index]?.name).toBe(expectedAuthor.name);
                expect(authors?.[index]?.url).toBe(expectedAuthor.url);
            });
        });
    });
});
