import type { INavigationService, NavigationResult } from "$application/ports";
import type { ILessonCatalog } from "$application/ports";

/**
 * Navigation service implementation that resolves adjacent lessons (previous/next) for
 * auto-navigation.
 *
 * This service delegates all navigation logic to {@link ILessonCatalog.findAdjacentByHref}, which
 * handles pathname normalization, lesson lookup, and adjacent lesson resolution. The catalog is
 * the semantic home for navigation queries since it owns the lesson data structure.
 *
 * Instantiated in {@link src/presentation/adapters/navigation-bridge.ts} once per route render.
 * Used by layout components to populate breadcrumb and auto-navigation UI.
 */
export class NavigationServiceImpl implements INavigationService {
    constructor(private readonly lessonCatalog: ILessonCatalog) {}

    /**
     * Resolves the previous and next lessons for a given pathname.
     *
     * @param pathname
     *   The current lesson's normalized pathname (e.g., `/notes/scripting/pipes/`)
     * @returns
     *   Promise resolving to NavigationResult with optional `previous` and `next` lesson nodes
     */
    async resolveAutoNav(pathname: string): Promise<NavigationResult> {
        return this.lessonCatalog.findAdjacentByHref(pathname);
    }
}
