import { AdjacentLessons } from "./adjacent-lessons";
import type { NavigationNode } from "./types";

export class LessonSequenceService {
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
