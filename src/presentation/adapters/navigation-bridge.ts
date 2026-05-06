/**
 * Presentation adapter for automatic lesson navigation.
 *
 * This module exposes a small, stable API consumed by the presentation layer (e.g.,
 * `NotesLayout`). Its responsibility is to:
 *
 * 1. Receive the current lesson pathname and the course structure.
 * 2. Delegate navigation resolution to the Application layer.
 * 3. Return only the minimal, serializable data required by the UI.
 *
 * The adapter intentionally hides infrastructure and domain details from the presentation layer.
 * In particular:
 *
 * - `LessonCatalogAdapter` remains internal to this module.
 * - `NavigationServiceImpl` is constructed locally.
 * - UI consumers receive only `{ title, href }` pairs.
 *
 * This keeps the layout components independent of domain concepts such as `NavigationNode`,
 * `slug`, or catalog implementations.
 *
 * ## Data Flow
 *
 * - `NotesLayout` calls `resolveAutoNav(pathname, lessons)`.
 * - `resolveAutoNav(...)` creates `NavigationServiceImpl`.
 * - `NavigationServiceImpl` reads lessons through `LessonCatalogAdapter`.
 * - `LessonCatalogAdapter` derives navigable entries from the course structure.
 *
 * ## Design Goals
 *
 * - Preserve **layer isolation** (Presentation -> Application -> Infrastructure).
 * - Return only **UI-safe, serializable values**.
 * - Keep the public API **stable even if the navigation service evolves**.
 * - Make the adapter easy to **unit test** by accepting the lesson structure directly instead of
 *   reading from global state.
 */

import {
    NavigationServiceImpl,
    type INavigationService,
    type AutoNavigationNode,
} from "@ravenhill/content-core";
import {
    type CourseLesson,
    LessonCatalogAdapter,
} from "$infrastructure/adapters/LessonCatalogAdapter";
import { getCourseNavigationTree } from "./course-navigation";

/**
 * Navigation link consumed by the presentation layer.
 *
 * Only the fields needed for rendering are exposed. This avoids leaking domain objects into the UI.
 */
export type AutoNavLink = {
    title: string;
    href: string;
};

/**
 * Public automatic-navigation result returned to the UI.
 *
 * Properties are **optional and omitted when unavailable**:
 *
 * - `previous` is absent for the first lesson.
 * - `next` is absent for the last lesson.
 *
 * Omitting properties instead of returning `null` keeps the resulting object simpler for
 * templating and conditional rendering.
 */
export type AutoNavResult = {
    previous?: AutoNavLink;
    next?: AutoNavLink;
};

/**
 * Narrows a domain navigation node to the minimal shape used by the UI.
 *
 * This prevents presentation components from depending on domain types such as `NavigationNode`.
 */
const toAutoNavLink = (
    node: AutoNavigationNode | undefined,
): AutoNavLink | undefined => node ? { title: node.title, href: node.href } : undefined;

/**
 * Local composition root for the automatic-navigation use case.
 *
 * Constructs the navigation service together with its infrastructure dependencies. Keeping this
 * wiring local avoids exposing catalog implementation details to the presentation layer.
 */
function createNavigationService(lessons: readonly CourseLesson[]): INavigationService {
    const catalog = new LessonCatalogAdapter(lessons);
    return new NavigationServiceImpl(catalog);
}

/**
 * Resolves previous/next lesson navigation for a given pathname.
 *
 * The function delegates navigation logic to the Application service, then converts the result
 * into the minimal shape required by the UI.
 *
 * ## Notes
 *
 * - The adapter intentionally **reconstructs the service per invocation**. Navigation resolution
 *   is lightweight and the stateless construction simplifies testability.
 * - The presentation layer remains unaware of the internal navigation model.
 *
 * @param pathname
 *   Absolute or relative lesson path used to locate the current node.
 * @param lessons
 *   Immutable course structure describing the ordered lesson catalog.
 * @returns
 *   An {@link AutoNavResult} containing optional links to the neighboring lessons in the catalog.
 * @example
 * ```ts
 * const nav = await resolveAutoNav(currentPath, lessons);
 *
 * if (nav.previous) {
 *   console.log(nav.previous.title);
 * }
 * ```
 */
export async function resolveAutoNav(
    pathname: string,
    lessons?: readonly CourseLesson[],
): Promise<AutoNavResult> {
    const navigationService = createNavigationService(lessons ?? await getCourseNavigationTree());
    const result = await navigationService.resolveAutoNav(pathname);

    const previous = toAutoNavLink(result.previous);
    const next = toAutoNavLink(result.next);

    return {
        ...(previous ? { previous } : {}),
        ...(next ? { next } : {}),
    };
}
