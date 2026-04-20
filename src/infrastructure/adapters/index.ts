/**
 * Infrastructure-adapter barrel.
 *
 * This module re-exports the infrastructure components that implement domain repository contracts. These adapters sit
 * at the boundary between the domain-facing abstractions consumed by the application layer and the concrete data
 * sources owned by infrastructure.
 *
 * Their responsibilities include:
 *
 * - implementing repository contracts such as {@link LessonMetadataRepository} and {@link LessonNavigationRepository}
 * - reading and interpreting infrastructure-owned data sources, such as generated course-structure JSON, metadata
 *   datasets, and caches
 * - translating infrastructure-specific representations into domain-safe results
 *
 * Keeping these details behind repository contracts prevents application and domain code from depending on JSON
 * layouts, cache mechanics, file loading, or other infrastructure concerns.
 *
 * These adapters are typically instantiated by presentation-side composition roots, such as `navigation-bridge.ts` and
 * `lesson-metadata-bridge.ts`, and then passed into application services explicitly.
 */
export { LessonCatalogAdapter } from "./LessonCatalogAdapter";
export { LessonMetadataAdapter } from "./LessonMetadataAdapter";
