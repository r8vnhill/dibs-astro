/**
 * @packageDocumentation
 *
 * Internal barrel for the `lesson-navigation` submodule.
 *
 * This module gathers the lesson-navigation model behind a single local boundary. It exists to keep the submodule easy 
 * to consume from the package entry point while preserving freedom to reorganize the internal file layout.
 *
 * It re-exports:
 *
 * - href value objects for canonical lesson locations;
 * - adjacency models for previous and next lesson relationships;
 * - trail models for breadcrumb-like ancestry paths;
 * - sequencing services for deriving lesson order from navigation trees;
 * - navigation service contracts and the default service implementation;
 * - repository contracts that isolate core navigation logic from host-side data;
 * - navigation DTOs and result shapes used by application adapters.
 *
 * The navigation layer is intentionally host-agnostic. It models lesson order, links, trails, and lookup results 
 * without depending on Astro, generated JSON, UI components, routing APIs, or a specific content source.
 *
 * Prefer importing from `@ravenhill/content-core` in application code. Importing from this internal path couples 
 * consumers to the current package layout and makes future refactors harder.
 *
 * @example
 * ```typescript
 * import {
 *   NavigationService,
 *   type LessonNavigationRepository,
 * } from "@ravenhill/content-core";
 * ```
 */

// Lesson-location value object used to normalize and compare lesson hrefs.
export { LessonHref } from "./lesson-href";

// Previous/next navigation model for lesson adjacency.
export { AdjacentLessons } from "./adjacent-lessons";

// Breadcrumb-like trail model for lesson ancestry.
export { LessonTrail } from "./lesson-trail";

// Pure service for deriving lesson sequences from navigation structures.
export { LessonSequenceService } from "./lesson-sequence-service";

// Default navigation service backed by a repository boundary.
export { NavigationService } from "./navigation-service";

// Repository boundary implemented by host-side navigation adapters.
export type { LessonNavigationRepository } from "./repositories";

// Navigation tree, trail, result, and service contracts.
export type {
    AutoNavigationNode,
    NavigationNode,
    NavigationResult,
    NavigationServiceContract,
    TrailNode,
} from "./types";
