import { LessonHref } from "./lesson-href";
import type { LessonNavigationRepository } from "./repositories";
import type { INavigationService, NavigationResult } from "./types";

export class NavigationServiceImpl implements INavigationService {
    constructor(private readonly lessonNavigationRepository: LessonNavigationRepository) {}

    async resolveAutoNav(pathname: string): Promise<NavigationResult> {
        const adjacentLessons = await this.lessonNavigationRepository.findAdjacentTo(
            LessonHref.create(pathname),
        );

        return {
            ...(adjacentLessons.previous
                ? {
                    previous: {
                        title: adjacentLessons.previous.title,
                        href: adjacentLessons.previous.href,
                    },
                }
                : {}),
            ...(adjacentLessons.next
                ? {
                    next: {
                        title: adjacentLessons.next.title,
                        href: adjacentLessons.next.href,
                    },
                }
                : {}),
        };
    }
}
