/**
 * @packageDocumentation
 *
 * Public API for `@ravenhill/content-core`.
 *
 * This package contains host-agnostic content services for learning platforms, documentation sites, and course
 * websites. It focuses on pure lesson-navigation and lesson-metadata concerns, without depending on Astro, generated
 * JSON files, UI components, validation adapters, or a specific CMS.
 *
 * The package is intentionally small and boundary-oriented:
 *
 * - navigation contracts model lesson hrefs, adjacency, trails, and sequencing;
 * - metadata contracts model authorship, publication dates, updates, and paths;
 * - service implementations depend on repository interfaces rather than host infrastructure;
 * - date and path helpers keep normalization rules reusable and testable.
 *
 * Consumers should import from this entry point instead of reaching into internal modules. That keeps the package free
 * to reorganize its implementation while preserving a stable public surface.
 *
 * @example
 * ```typescript
 * import {
 *   LessonMetadataServiceImpl,
 *   NavigationServiceImpl,
 *   type LessonMetadataRepository,
 *   type LessonNavigationRepository,
 * } from "@ravenhill/content-core";
 * ```
 */

import { version } from "../package.json" with { type: "json" };

/**
 * Canonical package name.
 *
 * Use this constant in workspace tests, dependency-boundary checks, and package identity assertions instead of
 * duplicating the literal package name.
 */
export const CONTENT_CORE_PACKAGE_NAME = "@ravenhill/content-core";

/**
 * Current package version.
 *
 * This value is useful for lightweight runtime diagnostics and workspace consumption checks. The authoritative
 * published version remains the package manager metadata.
 */
export const CONTENT_CORE_VERSION = version;

/**
 * Lesson-navigation public API.
 *
 * This group exposes the canonical lesson-navigation model:
 *
 * - {@link LessonHref} identifies normalized lesson locations;
 * - {@link AdjacentLessons} models previous/next lesson relationships;
 * - {@link LessonTrail} and {@link TrailNode} model breadcrumb-like trails;
 * - {@link NavigationNode} and {@link AutoNavigationNode} describe navigation trees;
 * - {@link LessonSequenceService} and {@link NavigationServiceImpl} provide the default service implementations;
 * - {@link LessonNavigationRepository} defines the host-side data boundary.
 */
export { AdjacentLessons, LessonHref, LessonSequenceService, LessonTrail, NavigationServiceImpl } from "./navigation";

export type {
    AutoNavigationNode,
    INavigationService,
    LessonNavigationRepository,
    NavigationNode,
    NavigationResult,
    TrailNode,
} from "./navigation";

/**
 * Lesson-metadata public API.
 *
 * This group exposes metadata records, DTOs, repositories, services, and pure helpers for normalizing lesson dates and
 * paths.
 *
 * The helpers are deliberately exported from the core package because consumers often need the same normalization
 * rules in tests, generated-data adapters, and presentation-facing boundaries.
 *
 * - {@link LessonMetadataRecord} is the normalized domain-facing metadata shape;
 * - {@link LessonMetadataDto} and related DTOs describe external input records;
 * - {@link LessonMetadataRepository} defines the host-side metadata boundary;
 * - {@link LessonMetadataServiceImpl} provides the default metadata service;
 * - {@link formatLessonDate}, {@link parseIsoShortDate}, and
 *   {@link resolveLessonDateDisplay} centralize date-display behavior;
 * - {@link normalizeLessonMetadataPathname} centralizes metadata path matching.
 */
export {
    DEFAULT_LESSON_METADATA_LOCALE,
    formatDate,
    formatLessonDate,
    LessonMetadataServiceImpl,
    normalizeLessonMetadataPathname,
    parseIsoShortDate,
    resolveLessonDateDisplay,
    UNKNOWN_LESSON_DATE_LABEL,
} from "./lesson-metadata";

export type {
    ILessonMetadataService,
    LessonDateDisplayResult,
    LessonMetadataAuthor,
    LessonMetadataAuthorDto,
    LessonMetadataChange,
    LessonMetadataChangeDto,
    LessonMetadataDto,
    LessonMetadataRecord,
    LessonMetadataRepository,
} from "./lesson-metadata";
