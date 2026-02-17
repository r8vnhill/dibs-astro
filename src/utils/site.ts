import { WEBSITE_PRIMARY_AUTHOR } from "~/data/site";

/**
 * Defines site-wide metadata constants for use throughout the application.
 */
export const site = {
    /**
     * A short identifier for the course/site, suitable for headers, navs, and tab titles.
     */
    SHORT_TITLE: "DIBS",

    /**
     * A longer, descriptive name for the course/site. Useful for page titles and SEO.
     */
    LONG_TITLE: "Diseño e Implementación de Bibliotecas de Software",

    /**
     * Information about the copyright holder.
     * Used in the footer and legal attribution.
     */
    COPYRIGHT_HOLDER: WEBSITE_PRIMARY_AUTHOR,

    /**
     * Shared paths and defaults for <head> metadata.
     */
    HEAD: {
        FAVICON_PATH: "/online-library.ico",
        SITEMAP_PATH: "/sitemap-index.xml",
        DEFAULT_SOCIAL_IMAGE: "/online-library.png",
    } as const,
} as const;
