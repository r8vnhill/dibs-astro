/**
 * @file navigation-queries.ts
 *
 * DOM query helpers for NotesLayout navigation assertions.
 *
 * This module centralizes selector patterns and extraction logic so test assertions
 * are consistent and maintainable. Query helpers use fail-fast patterns where required
 * elements are missing, providing clear error messages instead of silent failures.
 *
 * ## Two-function pattern
 *
 * Navigation queries follow a pattern of two functions:
 *
 * - `navigationFrom(doc)` — requires navigation to exist, throws if missing
 * - `maybeNavigationFrom(doc)` — returns null if navigation is absent
 *
 * Use the first when navigation must be present for the test to be meaningful.
 * Use the second when testing that navigation is absent.
 */

export interface RenderedNavigationLink {
    title: string;
    href: string;
}

/**
 * Normalize whitespace in text for consistent assertions.
 *
 * Collapses internal whitespace and trims leading/trailing.
 *
 * @param value Text to normalize
 * @returns Normalized text or empty string if value is falsy
 */
export const normalizedText = (
    value: string | null | undefined,
): string => value?.replace(/\s+/g, " ").trim() ?? "";

/**
 * Query for a required element or throw with a diagnostic message.
 *
 * @param parent Element to query within
 * @param selector CSS selector
 * @returns Element (asserted to exist)
 * @throws Error if selector does not match
 */
export const queryRequired = <T extends Element>(
    parent: ParentNode,
    selector: string,
): T => {
    const element = parent.querySelector<T>(selector);

    if (element === null) {
        throw new Error(`Expected selector to exist: ${selector}`);
    }

    return element;
};

/**
 * Query for the lesson navigation section, returning null if absent.
 *
 * Use when testing that navigation should be present.
 *
 * @param doc Document to query
 * @returns Navigation element or null
 */
export const maybeNavigationFrom = (doc: Document): HTMLElement | null =>
    doc.querySelector<HTMLElement>(
        "nav[aria-label=\"Siguiente o anterior lección\"]",
    );

/**
 * Query for the lesson navigation section, throwing if absent.
 *
 * Use when testing that navigation must exist.
 *
 * @param doc Document to query
 * @returns Navigation element
 * @throws Error if navigation is not found
 */
export const navigationFrom = (doc: Document): HTMLElement =>
    queryRequired<HTMLElement>(
        doc,
        "nav[aria-label=\"Siguiente o anterior lección\"]",
    );

/**
 * Extract all previous navigation links from a navigation element.
 *
 * @param nav Navigation element
 * @returns Array of rendered previous links (empty if none)
 */
export const previousLinksFrom = (
    nav: Element,
): readonly RenderedNavigationLink[] =>
    [...nav.querySelectorAll<HTMLAnchorElement>("a[rel=\"prev\"]")].map(
        (link) => ({
            title: normalizedText(link.textContent),
            href: link.getAttribute("href") ?? "",
        }),
    );

/**
 * Extract the next navigation link from a navigation element.
 *
 * @param nav Navigation element
 * @returns Rendered next link or null if absent
 */
export const nextLinkFrom = (
    nav: Element,
): RenderedNavigationLink | null => {
    const link = nav.querySelector<HTMLAnchorElement>("a[rel=\"next\"]");

    if (link === null) {
        return null;
    }

    return {
        title: normalizedText(link.textContent),
        href: link.getAttribute("href") ?? "",
    };
};
