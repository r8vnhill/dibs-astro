/**
 * Utility functions to handle automatic navigation resolution for lesson-based pages.
 *
 * These utilities help determine the previous and next pages based on a course structure and
 * normalize their URLs for consistent routing.
 */

import {
    flattenLessons,
    type FlattenedLesson,
    type Lesson,
} from "~/data/course-structure";

/**
 * Type representing a navigation link with additional lesson information.
 */
type NavigationLink = {
    /**
     * The title of the lesson or page.
     */
    title: string;
    /**
     * The normalized URL path for the lesson.
     */
    href: string;
} & Lesson;

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
 * Normalizes `next` and `previous` navigation links by applying `normalizeHref` to their `href`
 * properties.
 *
 * This ensures the navigation bar uses consistent and predictable links.
 *
 * @param next - Optional next page information
 * @param previous - Optional previous page information
 * @return An object with normalized `next` and `previous` entries
 */
export function normalizeNavigation(
    next: { title: string; href: string } | undefined,
    previous: { title: string; href: string } | undefined,
) {
    return {
        normalizedNext: next
            ? { ...next, href: normalizeHref(next.href) }
            : undefined,
        normalizedPrevious: previous
            ? { ...previous, href: normalizeHref(previous.href) }
            : undefined,
    };
}

/**
 * Resolves the previous and next lessons for a given current path, based on a flattened version of
 * the course structure.
 *
 * This enables automatic navigation between lessons without manual links.
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
