/**
 * Utility functions for lesson navigation.
 *
 * This module has two related responsibilities:
 *
 * - normalize small navigation payloads passed manually by pages or layouts;
 * - resolve automatic previous/next links from the linearized course structure.
 *
 * The split matters because the site now supports two different navigation shapes:
 *
 * - singular links for `next` and the legacy `previous` contract;
 * - a list of `previous` links for comparative or branch-style lessons.
 *
 * Callers that only need route canonicalization should use the normalization helpers. Callers that
 * need course-aware navigation should use {@link resolveAutoNav}.
 */

import { type FlattenedLesson, flattenLessons, type Lesson } from "~/data/course-structure";

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
 * Type representing a navigation link with additional lesson information.
 *
 * This stays internal because only auto navigation needs the extra `Lesson` fields.
 */
type NavigationLink = NavigationLinkInput & Lesson;

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
    let result = href.startsWith("/") ? href : `/${href}`;
    if (result.length > 1 && !result.endsWith("/")) result += "/";
    return result;
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

/**
 * Resolves the previous and next lessons for a given current path, based on a flattened version of
 * the course structure.
 *
 * This enables automatic navigation between lessons without manual links. The result is still
 * singular by design: course structure only defines one linear predecessor and one linear
 * successor for each lesson.
 *
 * @param pathname - The current page's pathname (e.g., "/unidad-1/contenido-2/")
 * @param lessons - The complete nested course structure
 * @return An object containing the `previous` and `next` lessons, if available
 */
export function resolveAutoNav(
    pathname: string,
    lessons: Lesson[],
): {
    previous: NavigationLink | undefined;
    next: NavigationLink | undefined;
} {
    // Flatten the nested course structure to a linear list of lessons
    // and exclude container entries that don't have an href.
    const flat = flattenLessons(lessons).filter(
        (
            l,
        ): l is FlattenedLesson & { href: string } =>
            typeof l.href === "string" && l.href.length > 0,
    );

    // Find the index of the current lesson in the flattened list
    const currentIndex = flat.findIndex(
        (l) => normalizeHref(l.href) === normalizeHref(pathname),
    );

    if (currentIndex === -1) {
        return { previous: undefined, next: undefined };
    }

    return {
        // Get the lesson before the current one, if any
        previous: flat[currentIndex - 1],
        // Get the lesson after the current one, if any
        next: flat[currentIndex + 1],
    };
}
