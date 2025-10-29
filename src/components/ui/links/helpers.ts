/**
 * Normalize language link targets for language-specific link wrappers.
 *
 * @param pathname Current page pathname (from Astro.url.pathname).
 * @param slug Optional override for the base path (e.g., when linking from a list page).
 * @param segment Path segment for the language-specific page (e.g., "py" or "nushell").
 * @returns Base path and resolved href with trailing slash.
 */
export function resolveLanguageHref(
    pathname: string,
    slug: string | undefined,
    segment: string,
) {
    const base = (slug ?? pathname).replace(/\/$/, "");
    const normalized = segment.replace(/^\/+|\/+$/g, "");
    const href = `${base}/${normalized}/`;
    return { base, href };
}
