import type { AdjacentLessons } from "./adjacent-lessons";
import type { LessonHref } from "./lesson-href";

export interface LessonNavigationRepository {
    findAdjacentTo(href: LessonHref): Promise<AdjacentLessons>;
}
