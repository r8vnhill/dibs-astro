/**
 * Domain service for finding lessons adjacent to a target within a sequence.
 *
 * Pure functions that operate on collections of NavigationNode without side effects.
 */

import { type NavigationNode } from "$domain/value-objects/AdjacentLessons";
import { AdjacentLessons } from "$domain/value-objects/AdjacentLessons";

/**
 * Provides sequence-based navigation queries over a flat list of lessons.
 *
 * All methods are static and pure (no state, idempotent, no side effects).
 */
export class LessonSequenceService {
    /**
     * Finds the previous and next lessons relative to a target lesson.
     *
     * Locates a lesson by matching its href (after normalization) and returns
     * the adjacent lessons in the sequence.
     *
     * @param lessons - A flat list of lessons with navigation nodes.
     * @param targetHref - The route path (href) to search for (e.g., `/notes/foo/`).
     * @param normalizer - Function to normalize hrefs for comparison.
     *                     Typically handles trailing slashes, multiple slashes, etc.
     *
     * @returns An AdjacentLessons with previous/next set, or empty if target not found.
     *
     * @throws Error if normalizer function throws.
     *
     * @example
     * const lessons = [
     *   { title: "A", slug: "a", href: "/notes/a/" },
     *   { title: "B", slug: "b", href: "/notes/b/" },
     *   { title: "C", slug: "c", href: "/notes/c/" },
     * ];
     * const result = LessonSequenceService.findAdjacent(
     *   lessons,
     *   "/notes/b/",
     *   (href) => href.toLowerCase()
     * );
     * // result.previous?.slug === "a"
     * // result.next?.slug === "c"
     */
    static findAdjacent(
        lessons: readonly NavigationNode[],
        targetHref: string,
        normalizer: (href: string) => string,
    ): AdjacentLessons {
        const normalizedTarget = normalizer(targetHref);
        const targetIndex = lessons.findIndex(
            (lesson) => normalizer(lesson.href) === normalizedTarget,
        );

        if (targetIndex === -1) {
            return AdjacentLessons.create();
        }

        const previous = targetIndex > 0 ? lessons[targetIndex - 1] : undefined;
        const next = targetIndex < lessons.length - 1 ? lessons[targetIndex + 1] : undefined;

        return AdjacentLessons.create(previous, next);
    }
}
