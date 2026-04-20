import type { INavigationService, NavigationResult } from "$application/ports";
import type { LessonNavigationRepository } from "$domain/repositories";
import { LessonHref } from "$domain/value-objects/LessonHref";

/**
 * Navigation service implementation that resolves adjacent lessons (previous/next) for
 * auto-navigation.
 *
 * This service performs only boundary conversion and orchestration:
 * it turns the incoming pathname into a canonical {@link LessonHref}, delegates the adjacency
 * lookup to a domain-oriented repository, and maps the domain result into the application output.
 *
 * Instantiated in {@link src/presentation/adapters/navigation-bridge.ts} once per route render.
 * Used by layout components to populate breadcrumb and auto-navigation UI.
 */
export class NavigationServiceImpl implements INavigationService {
    constructor(private readonly lessonNavigationRepository: LessonNavigationRepository) {}

    /**
     * Resolves the previous and next lessons for a given pathname.
     *
     * @param pathname
     *   The current lesson's normalized pathname (e.g., `/notes/scripting/pipes/`)
     * @returns
     *   Promise resolving to NavigationResult with optional `previous` and `next` lesson nodes
     */
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
