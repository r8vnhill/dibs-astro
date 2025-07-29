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
  COPYRIGHT_HOLDER: {
    name: "Ignacio Slater-Muñoz",
    url: "https://www.ravenhill.cl",
  } as const,
} as const;
