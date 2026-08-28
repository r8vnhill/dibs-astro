import { createAstroRenderer } from "../../../test-utils/astro-render";
import Head from "../Head.astro";

/** DIBS defaults emitted when a page supplies no title/description/url props. */
export const DEFAULT_TITLE = "DIBS";
export const DEFAULT_DESCRIPTION = "Diseño e Implementación de Bibliotecas de Software";
export const DEFAULT_CANONICAL_URL = "https://dibs.ravenhill.cl/";

/** DIBS-owned document-resource values appended by `Head.astro`. */
export const SOCIAL_IMAGE_PATH = "/dibs_logo_light.png";
export const FAVICON_PATH = "/dibs_icon.png";
export const SITEMAP_PATH = "/sitemap-index.xml";
export const GOOGLE_FONTS_ORIGIN = "https://fonts.googleapis.com";
export const GOOGLE_FONTS_STATIC_ORIGIN = "https://fonts.gstatic.com";
export const BASE_FONT_STYLESHEET =
    "https://fonts.googleapis.com/css2?family=Fira+Code&family=Inter:ital,wght@0,400..700;1,400..700&family=Space+Grotesk:ital,wght@0,400..700;1,400..700&display=swap";
export const OPTIONAL_404_FONT_STYLESHEET = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";

/** Renders the DIBS `Head.astro` adapter to an HTML string for semantic projection. */
export const renderHead = async (props: Record<string, unknown>): Promise<string> => {
    const renderer = await createAstroRenderer<Record<string, unknown>>(Head);
    return renderer(props);
};
