import type { HeadLink, MetadataUrl } from "@ravenhill/astro-head";

/** Explicit inputs for {@link buildDibsHeadLinks}; the caller owns the concrete URLs. */
export interface DibsHeadLinkOptions {
    /** Favicon resource selected by DIBS. */
    readonly faviconHref: MetadataUrl;

    /** Base Fira Code + Inter + Space Grotesk stylesheet selected by DIBS. */
    readonly baseFontStylesheet: MetadataUrl;
}

/**
 * Select the DIBS-owned icon and base-font document resources in their required
 * order. Rendering belongs to `@ravenhill/astro-head`; this helper only decides
 * which resources exist, their relations, and their sequence.
 *
 * The sitemap relation and the optional 404 font are intentionally excluded: the
 * package emits `links` before the adapter's trailing local markup, so routing
 * them here would reorder them relative to the locally rendered sitemap.
 */
export function buildDibsHeadLinks({
    faviconHref,
    baseFontStylesheet,
}: DibsHeadLinkOptions): readonly HeadLink[] {
    return [
        {
            rel: "icon",
            href: faviconHref,
            type: "image/png",
        },
        {
            rel: "preconnect",
            href: "https://fonts.googleapis.com",
        },
        {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
            crossOrigin: "anonymous",
        },
        {
            rel: "stylesheet",
            href: baseFontStylesheet,
        },
    ];
}
