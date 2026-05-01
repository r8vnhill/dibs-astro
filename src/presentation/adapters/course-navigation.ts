/**
 * Presentation adapter for the course navigation tree.
 *
 * Provides presentation-layer callers with the course structure (lesson hierarchy and
 * navigation metadata) while hiding the infrastructure-layer lesson catalog implementation.
 * This keeps the navigation sidebar and breadcrumb logic independent of domain concepts
 * such as lesson slugs or raw catalog records.
 *
 * @see {@link LessonCatalogAdapter} for the infrastructure implementation
 */

import type { CourseLesson } from "$infrastructure/adapters/LessonCatalogAdapter";
import { LessonCatalogAdapter } from "$infrastructure/adapters/LessonCatalogAdapter";

export type CourseNavigationLesson = CourseLesson;

export async function getCourseNavigationTree(): Promise<readonly CourseNavigationLesson[]> {
    return new LessonCatalogAdapter().getCourseStructure();
}
