/**
 * Application-service implementation barrel.
 *
 * This module re-exports the concrete implementations of the application-layer service contracts. These services sit 
 * between presentation and domain/infrastructure concerns and act as small orchestration units rather than 
 * policy-heavy components.
 *
 * ## Their responsibilities include:
 *
 * - accepting presentation-facing input, such as raw pathname strings
 * - converting external input into domain-safe values when needed
 * - delegating lookup and business rules to repositories and other lower-level collaborators
 * - mapping domain results into DTOs consumed through the application boundary
 *
 * These implementations are typically instantiated by presentation-side composition roots, such as
 * `navigation-bridge.ts` and `lesson-metadata-bridge.ts`.
 *
 * Prefer importing implementations from this barrel when wiring local composition, while keeping callers dependent on 
 * the corresponding port contracts such as {@link INavigationService} and {@link ILessonMetadataService}.
 */
export { LessonMetadataServiceImpl } from "./LessonMetadataServiceImpl";
export { NavigationServiceImpl } from "./NavigationServiceImpl";
