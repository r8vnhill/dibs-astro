/**
 * Public barrel for shared utility helpers, constants, and types.
 *
 * This module defines the stable import surface for cross-cutting utilities used across layouts, components, 
 * infrastructure adapters, and tests. It provides one predictable entry point for helpers that are intentionally 
 * reusable, while keeping feature-local and implementation-specific modules private to their own subpaths.
 *
 * ## Export policy
 *
 * This barrel should only expose utilities that are:
 *
 * - broadly reusable across multiple features or layers;
 * - stable enough to be treated as part of the shared utility API;
 * - safe to import from rendering code, infrastructure code, and tests.
 *
 * Modules that are narrowly scoped to a single feature, or that mainly exist as internal implementation details, 
 * should not be re-exported here.
 *
 * Development-oriented helpers may still be exported when they support shared runtime behavior or local development 
 * workflows used across the project.
 *
 * ## Export groups
 *
 * This barrel currently exposes utilities for:
 *
 * - heading and semantic typing;
 * - lesson metadata parsing, dataset resolution, and date formatting;
 * - lesson navigation normalization and automatic adjacency resolution;
 * - page metadata construction;
 * - generic runtime and repository-link helpers;
 * - theme detection and theme application.
 *
 * ## Usage
 *
 * Prefer importing shared utilities from this module when the re-exported symbol is part of the intended public 
 * utility surface.
 *
 * ```typescript
 * import { formatLessonDate, normalizeNavigation, site } from "~/utils";
 * ```
 */

// Heading and semantic helpers
export type { HeadingLevel } from "./heading-level.ts";

// Lesson metadata runtime helpers (dataset parsing, JSON resolution, and formatting)
export {
    DEFAULT_LOCALE,
    formatDate,
    formatLessonDate,
    getLessonMetadataDataset,
    normalizeLessonPathname,
    parseIsoShortDate,
    parseLessonMetadataDataset,
    UNKNOWN_DATE_LABEL,
} from "./lesson-metadata.ts";

// Lesson navigation helpers
//
// `normalizeNavigationLink` and `normalizeNavigation` preserve the historical single-link contract used by 
// next/previous navigation pairs, while `normalizePreviousNavigation` exposes the newer list-based shape consumed by 
// `NotesLayout` for multi-link "previous" navigation.
export {
    type NavigationLinkInput,
    normalizeNavigation,
    normalizeNavigationLink,
    normalizePreviousNavigation,
    resolveAutoNav,
} from "./navigation.ts";

// Page metadata helpers
export { buildHeadPageMeta, type PageMeta } from "./page-meta.ts";

// Generic cross-cutting runtime utilities
export {
    type DevTransportRetryOptions,
    isRetryableDevTransportError,
    runWithDevTransportRetry,
} from "./dev-transport-retry.ts";
export {
    buildCommitUrl,
    type BuildCommitUrlOptions,
    buildRepoLinkText,
    type BuildRepoLinkTextOptions,
    buildRepoUrl,
    type BuildRepoUrlOptions,
    DEFAULT_REPO_PLATFORMS,
    isRepoPlatform,
    normalizePlatforms,
    REPO_PLATFORM_HOST,
    REPO_PLATFORM_LABEL,
    type RepoPlatform,
    type RepoRef,
} from "./git.ts";
export { pickRandom } from "./random.ts";
export { site } from "./site.ts";
export type { default as StyledComponent } from "./styled-component.ts";

// Theme helpers
export {
    applyTheme,
    getColorSchemeMediaQuery,
    isDarkModePreferred,
    type Theme,
    theme,
} from "./theme.ts";
