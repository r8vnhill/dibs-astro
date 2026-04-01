/**
 * Central export barrel for shared utility helpers and utility types.
 *
 * This file groups utilities by concern so callers can import from `~/utils` without needing to
 * know each module path. It also acts as the public utility surface for internal application code:
 * if a helper is exported here, other modules can usually depend on it without reaching into
 * subpaths.
 *
 * Export policy:
 * - Keep broadly reusable helpers here, not feature-local implementation details.
 * - Prefer exporting stable helpers that are safe to reuse across layouts, content rendering, and
 *   infrastructure code.
 * - Development-only helpers may still be exported here when they support shared runtime behavior
 *   across subsystems, such as the transient transport retry used by Shiki-related dev flows.
 *
 * Example:
 * `import { resolveAutoNav, formatLessonDate, site } from "~/utils";`
 */

// Heading/semantics helpers
export type { HeadingLevel } from "./heading-level.ts";

// Lesson metadata runtime helpers (generated JSON resolution + formatting)
export {
    DEFAULT_LOCALE,
    formatDate,
    formatLessonDate,
    getLessonMetadataDataset,
    normalizeLessonPathname,
    parseIsoShortDate,
    parseLessonMetadataDataset,
    resolveLessonMetadata,
    UNKNOWN_DATE_LABEL,
} from "./lesson-metadata.ts";

// Lesson navigation helpers
//
// `normalizeNavigationLink` and `normalizeNavigation` keep the historical singular contract used by
// next/previous pairs, while `normalizePreviousNavigation` exposes the newer list-based shape that
// `NotesLayout` uses for multi-link "previous" navigation.
export {
    type NavigationLinkInput,
    normalizeNavigation,
    normalizeNavigationLink,
    normalizePreviousNavigation,
    resolveAutoNav,
} from "./navigation.ts";
export { buildHeadPageMeta, type PageMeta } from "./page-meta.ts";

// Generic and cross-cutting runtime utilities
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

// Theme utilities
export {
    applyTheme,
    getColorSchemeMediaQuery,
    isDarkModePreferred,
    type Theme,
    theme,
} from "./theme.ts";
