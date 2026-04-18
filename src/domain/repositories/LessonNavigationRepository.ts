import type { AdjacentLessons } from "$domain/value-objects/AdjacentLessons";
import type { LessonHref } from "$domain/value-objects/LessonHref";

/**
 * Domain repository for lesson-to-lesson navigation queries.
 *
 * This contract describes the navigation data the application layer needs without exposing how
 * infrastructure derives it from authored course structures or other data sources.
 */
export interface LessonNavigationRepository {
    /**
     * Finds the lessons adjacent to the lesson identified by the given canonical href.
     *
     * @param href Canonical lesson href used as the navigation lookup key.
     * @returns Previous/next lesson context for the given href.
     */
    findAdjacentTo(href: LessonHref): Promise<AdjacentLessons>;
}
