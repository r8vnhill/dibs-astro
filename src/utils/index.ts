/**
 * Stable public barrel for shared utility helpers, constants, and types.
 *
 * This module defines the approved cross-cutting utility surface exposed by `~/utils`. It exists to give layouts, 
 * components, infrastructure adapters,
 * and tests a single predictable import path for helpers that are intentionally
 * shared across the project.
 *
 * Re-exporting a symbol here signals that it is considered part of the
 * project-wide utility API. Modules that are feature-local, transitional, or
 * primarily implementation details should remain private to their own paths
 * instead of being surfaced through this barrel.
 *
 * ## Export policy
 *
 * Prefer re-exporting a helper here only when it is:
 *
 * - broadly reusable across multiple features or layers;
 * - stable enough to be treated as part of the shared utility surface;
 * - safe to import from rendering code, infrastructure code, and tests.
 *
 * Do not re-export modules whose purpose is mainly:
 *
 * - supporting a single feature;
 * - preserving an internal implementation detail;
 * - exposing a transitional compatibility layer that does not belong in the
 *   long-term public utility surface.
 *
 * Development-oriented helpers may still belong here when they support shared
 * runtime behaviour or project-wide local development workflows.
 *
 * ## Export groups
 *
 * This barrel currently exposes:
 *
 * - heading and semantic typing helpers;
 * - page-metadata helpers;
 * - generic runtime and repository-link utilities;
 * - theme detection and theme application helpers.
 *
 * ## Usage
 *
 * Prefer importing from `~/utils` when the symbol is intentionally part of the
 * shared utility API.
 *
 * ```ts
 * import { buildRepoUrl, site } from "~/utils";
 * ```
 */

// Heading and semantic typing
export type { HeadingLevel } from "./heading-level.ts";

// Page metadata
export { buildHeadPageMeta, type PageMeta } from "./page-meta.ts";

// Cross-cutting runtime utilities
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

// Theme detection and application
export {
    applyTheme,
    getColorSchemeMediaQuery,
    isDarkModePreferred,
    type Theme,
    theme,
} from "./theme.ts";
