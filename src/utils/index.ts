/**
 * Central export barrel for shared utility helpers and utility types.
 *
 * This file groups utilities by concern so callers can import from `~/utils` without needing to
 * know each module path. It also acts as the public utility surface for internal application code:
 * if a helper is exported here, other modules can usually depend on it without reaching into
 * subpaths.
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
    normalizeNavigation,
    normalizeNavigationLink,
    normalizePreviousNavigation,
    resolveAutoNav,
    type NavigationLinkInput,
} from "./navigation.ts";
export { buildHeadPageMeta, type PageMeta } from "./page-meta.ts";

// Generic utilities
export {
    buildCommitUrl,
    buildRepoLinkText,
    buildRepoUrl,
    DEFAULT_REPO_PLATFORMS,
    isRepoPlatform,
    normalizePlatforms,
    REPO_PLATFORM_HOST,
    REPO_PLATFORM_LABEL,
    type BuildRepoLinkTextOptions,
    type BuildCommitUrlOptions,
    type BuildRepoUrlOptions,
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
