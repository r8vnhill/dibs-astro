import { WEBSITE_PRIMARY_AUTHOR } from "$presentation/adapters/site-data";
import { load } from "cheerio";
import type { CheerioAPI } from "cheerio";
import { createAstroRenderer } from "../../../test-utils/astro-render";
import Head from "../Head.astro";

export const ARTICLE_URL = "https://dibs.ravenhill.cl/notes/example/";
export const WEBSITE_URL = "https://dibs.ravenhill.cl/";
export const DATE_LAST_MODIFIED = "2026-02-17";
export const LANGUAGE_ES = "es";
export const ARTICLE_TITLE = "Lección de ejemplo";
export const ARTICLE_DESCRIPTION = "Descripción de prueba";
export const WEBSITE_TITLE = "Inicio";
export const WEBSITE_DESCRIPTION = "Página principal";
export const DEFAULT_TITLE = "DIBS";
export const DEFAULT_DESCRIPTION = "Diseño e Implementación de Bibliotecas de Software";
export const DEFAULT_CANONICAL_URL = "https://dibs.ravenhill.cl/";
export const SECONDARY_AUTHOR = "Proyecto DIBS";
export const JSONLD_CONTEXT = "https://schema.org";
export const JSONLD_TYPE_ARTICLE = "Article";
export const CANONICAL_LINK_REL = "rel=\"canonical\"";
export const OG_TYPE_ARTICLE = "<meta property=\"og:type\" content=\"article\">";
export const OG_TYPE_WEBSITE = "<meta property=\"og:type\" content=\"website\">";
export const CITATION_AUTHOR_NAME = "name=\"citation_author\"";
export const CITATION_DATE_NAME = "name=\"citation_date\"";
export const CITATION_LAST_MODIFIED_NAME = "name=\"citation_last_modified_date\"";
export const CITATION_TITLE_NAME = "name=\"citation_title\"";
export const CITATION_PUBLIC_URL_NAME = "name=\"citation_public_url\"";
export const CITATION_LANGUAGE_NAME = "name=\"citation_language\"";
export const OG_LOCALE_ES = "<meta property=\"og:locale\" content=\"es_CL\">";
export const OG_LOCALE_EN = "<meta property=\"og:locale\" content=\"en_GB\">";
export const SOCIAL_IMAGE_PATH = "/DIBS.logo.png";
export const FAVICON_ICO_PATH = "/favicon.ico";
export const FAVICON_PNG_PATH = "/DIBS.logo.png";
export const SITEMAP_PATH = "/sitemap-index.xml";
export const GOOGLE_FONTS_ORIGIN = "https://fonts.googleapis.com";
export const GOOGLE_FONTS_STATIC_ORIGIN = "https://fonts.gstatic.com";
export const BASE_FONT_STYLESHEET =
    "https://fonts.googleapis.com/css2?family=Fira+Code&family=Inter:ital,wght@0,400..700;1,400..700&family=Space+Grotesk:ital,wght@0,400..700;1,400..700&display=swap";
export const OPTIONAL_404_FONT_STYLESHEET = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
export const DC_TYPE_WEBPAGE = "<meta name=\"DC.type\" content=\"Web Page\">";
export const DC_TYPE_JOURNAL_ARTICLE = "<meta name=\"DC.type\" content=\"Journal Article\">";
export { WEBSITE_PRIMARY_AUTHOR };

export const renderHead = async (props: Record<string, unknown>): Promise<string> => {
    const renderer = await createAstroRenderer<Record<string, unknown>>(Head);
    return renderer(props);
};

const parseHtml = (html: string): CheerioAPI => load(html);

export const getTitleText = (html: string): string | undefined => parseHtml(html)("title").first().text() || undefined;

export const getMetaContent = (
    html: string,
    selector: `meta[${string}]`,
): string | undefined => parseHtml(html)(selector).first().attr("content");

export const getMetaContentByName = (
    html: string,
    name: string,
): string | undefined => getMetaContent(html, `meta[name="${name}"]`);

export const getMetaContentByProperty = (
    html: string,
    property: string,
): string | undefined => getMetaContent(html, `meta[property="${property}"]`);

export const getLinkAttribute = (
    html: string,
    rel: string,
    attribute: string,
): string | undefined =>
    parseHtml(html)(`link[rel="${rel}"]`)
        .first()
        .attr(attribute);

export const countElements = (html: string, selector: string): number => parseHtml(html)(selector).length;

export function extractJsonLd(html: string): Record<string, unknown> | undefined {
    const payload = parseHtml(html)("script[type=\"application/ld+json\"]")
        .first()
        .text();
    if (!payload) return undefined;

    try {
        return JSON.parse(payload.trim()) as Record<string, unknown>;
    } catch {
        return undefined;
    }
}
