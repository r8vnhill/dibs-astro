/**
 * @packageDocumentation
 *
 * Public API for `@ravenhill/content-core`.
 *
 * This package provides host-agnostic content services for learning platforms, documentation sites, and course
 * websites. It focuses on three reusable content concerns:
 *
 * - lesson navigation: canonical hrefs, adjacency, trails, sequencing, and navigation lookup;
 * - lesson metadata: authorship, provenance, dates, history, and validated metadata records;
 * - curriculum: a minimal, host-agnostic data contract for concepts, facets, and units.
 *
 * The package does not depend on Astro, generated JSON files, CMS APIs, UI frameworks, or host-specific routing. Host
 * applications provide data through repository contracts, while this package provides pure value objects, service
 * implementations, result types, and normalization helpers.
 *
 * Public records use branded values to represent fields that have crossed a validation boundary. Date, path, and
 * branded-value parsers are exported so adapters, tests, and generated-data loaders can apply the same rules as the
 * service layer.
 *
 * Import from this entry point only. Submodule imports couple consumers to the current internal layout and are not
 * part of the supported package contract.
 *
 * @example
 * ```typescript
 * import {
 *   LessonMetadataService,
 *   NavigationService,
 *   type LessonMetadataRepository,
 *   type LessonNavigationRepository,
 * } from "@ravenhill/content-core";
 * ```
 */

import packageJson from "../package.json" with { type: "json" };

/**
 * Canonical package name.
 *
 * Use this constant in workspace tests, dependency-boundary checks, diagnostics, and package identity assertions
 * instead of duplicating the literal package name.
 */
export const CONTENT_CORE_PACKAGE_NAME = "@ravenhill/content-core";

/**
 * Current package version.
 *
 * This value is read from package metadata so runtime diagnostics and workspace consumption checks report the same
 * version as the package manager.
 */
export const CONTENT_CORE_VERSION = packageJson.version;

/**
 * Lesson-navigation public API.
 *
 * This group exposes the navigation model and services used to resolve lesson order, links, and ancestry:
 *
 * - {@link LessonHref} normalizes and compares lesson hrefs;
 * - {@link AdjacentLessons} models previous and next lesson relationships;
 * - {@link LessonTrail} and {@link TrailNode} model breadcrumb-like ancestry;
 * - {@link LessonSequenceService} derives ordered lesson sequences;
 * - {@link NavigationService} resolves navigation data through a repository;
 * - {@link LessonNavigationRepository} isolates host-side navigation storage;
 * - {@link NavigationServiceContract} defines the service boundary.
 */
export { AdjacentLessons, LessonHref, LessonSequenceService, LessonTrail, NavigationService } from "./navigation";

export type {
    AutoNavigationNode,
    LessonNavigationRepository,
    NavigationNode,
    NavigationResult,
    NavigationServiceContract,
    TrailNode,
} from "./navigation";

/**
 * Lesson-metadata public API.
 *
 * This group exposes validated metadata records, semantic branded values, parser helpers, explicit lookup/resolution
 * results, repository contracts, and the default metadata service.
 *
 * Metadata lookup distinguishes three states:
 *
 * - `found`: metadata exists and has been validated;
 * - `missing`: no metadata record matched the lesson;
 * - `invalid`: a matching record exists but failed validation.
 *
 * This distinction lets host adapters and presentation layers avoid treating broken generated metadata as ordinary
 * absence.
 */
export {
    LessonMetadataService,
    normalizeLessonMetadataPathname,
    parseAbsoluteUrl,
    parseGitCommitHash,
    parseIsoShortDate,
    parseIsoShortDateValue,
    parseLessonSourceFile,
    parseNonEmptyText,
    resolveLessonDate,
} from "./lesson-metadata";

export type {
    AbsoluteUrl,
    GitCommitHash,
    IsoShortDate,
    LessonDate,
    LessonMetadataAuthor,
    LessonMetadataAuthorDto,
    LessonMetadataChange,
    LessonMetadataChangeDto,
    LessonMetadataDto,
    LessonMetadataIssue,
    LessonMetadataLookupResult,
    LessonMetadataRecord,
    LessonMetadataRepository,
    LessonMetadataResolutionResult,
    LessonMetadataServiceContract,
    LessonSourceFile,
    NonEmptyText,
} from "./lesson-metadata";

/**
 * Curriculum public API.
 *
 * This group exposes the smallest coherent, host-agnostic curriculum data contract:
 *
 * - {@link CurriculumConcept} is a minimal reusable concept identity a unit can reference;
 * - {@link CurriculumFacets} is a generic dimension-to-tags mechanism with no built-in vocabulary;
 * - {@link CurriculumUnit} groups concepts and facets with optional, opaque host-owned metadata.
 *
 * This is a data contract only. It does not model relationships, traversal, validation, or any concrete facet or
 * language vocabulary; those remain host policy.
 */
export type { CurriculumConcept, CurriculumFacets, CurriculumUnit } from "./curriculum";
