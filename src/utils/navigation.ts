/**
 * Presentation-facing helpers for small lesson-navigation payloads.
 *
 * This module intentionally owns only local UI normalization for manually supplied navigation
 * links. Automatic previous/next resolution lives in the presentation adapter layer
 * (`presentation/adapters/navigation-bridge.ts`).
 *
 * The site supports two navigation shapes:
 *
 * - singular links for `next` and the legacy `previous` contract;
 * - a list of `previous` links for comparative or branch-style lessons.
 */

import { LessonHref } from "$domain/value-objects/LessonHref";

/**
 * Public navigation payload consumed by lesson layouts and pages.
 *
 * This is intentionally smaller than a full `Lesson` entry so page frontmatter and presentation
 * code can override navigation without coupling to course-structure internals.
 */
export type NavigationLinkInput = Readonly<{
    /**
     * User-facing lesson title.
     */
    title: string;
    /**
     * Relative lesson URL.
     */
    href: string;
}>;

/**
 * Normalizes a URL path by ensuring it starts and ends with a single `/`.
 *
 * This helps avoid inconsistencies in navigation logic and matching.
 *
 * @param href - The URL path to normalize (e.g., "foo", "/bar", "/baz/")
 * @return A normalized path that always starts with `/` and ends with `/` (unless it's root)
 *
 * @example
 * normalizeHref("foo") // "/foo/"
 * normalizeHref("/bar") // "/bar/"
 * normalizeHref("/") // "/"
 */
function normalizeHref(href: string): string {
    return LessonHref.create(href).value;
}

/**
 * Normalizes a single navigation link.
 *
 * The returned object preserves the original title and only canonicalizes the route.
 */
export function normalizeNavigationLink(
    link: NavigationLinkInput | undefined,
): NavigationLinkInput | undefined {
    return link
        ? { ...link, href: normalizeHref(link.href) }
        : undefined;
}

/**
 * Normalizes one or many `previous` links into a stable list.
 *
 * This lets layouts support both the historical single-link contract and the newer multi-link
 * variant without forcing callers to normalize the shape themselves.
 */
export function normalizePreviousNavigation(
    previous: NavigationLinkInput | readonly NavigationLinkInput[] | undefined,
): readonly NavigationLinkInput[] {
    if (!previous) return [];

    const links = Array.isArray(previous) ? previous : [previous];
    return links.map((link) => ({ ...link, href: normalizeHref(link.href) }));
}

/**
 * Normalizes `next` and `previous` navigation links by applying `normalizeHref` to their `href`
 * properties.
 *
 * This keeps the historical pair-shaped contract used by parts of the UI that still treat
 * navigation as a singular previous/next pair. For multi-previous navigation, callers should use
 * {@link normalizePreviousNavigation} instead.
 *
 * @param next - Optional next page information
 * @param previous - Optional previous page information
 * @return An object with normalized `next` and `previous` entries
 */
export function normalizeNavigation(
    next: NavigationLinkInput | undefined,
    previous: NavigationLinkInput | undefined,
) {
    return {
        normalizedNext: normalizeNavigationLink(next),
        normalizedPrevious: normalizeNavigationLink(previous),
    };
}
