/**
 * @file data/site.ts
 *
 * Site-level configuration.
 *
 * This module centralizes configuration that is specific to this website, rather than generic git
 * utilities.
 *
 * Currently, it exposes:
 *
 * - {@link WEBSITE_REPO_REFS}: repository references grouped by hosting platform.
 * - {@link getWebsiteRepoRef}: a small accessor utility.
 *
 * By keeping repository definitions here:
 *
 * - UI components remain free of hard-coded `user/repo` strings.
 * - Repository renames or migrations are isolated to a single file.
 * - Platform availability becomes explicit and type-safe.
 */

import type { RepoPlatform, RepoRef } from "~/utils/git";

/**
 * A utility type for defining partial records with specific keys.
 */
type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

/**
 * Repository references for this website, keyed by hosting platform.
 *
 * ## Design notes
 *
 * - Declared as `Partial<Record<RepoPlatform, RepoRef>>`:
 *   - If a new {@link RepoPlatform} is added in `utils/git.ts`,
 *     this file is *not* forced to define it.
 *   - Missing platforms are treated as “not available”.
 * - Declared `as const` to:
 *   - Preserve literal types.
 *   - Prevent accidental mutation.
 *
 * Consumers (e.g. `LessonMetaPanel`) should:
 *
 * - Filter platforms using this mapping.
 * - Only render links for platforms that exist here.
 *
 * ## Example
 *
 * ```ts
 * import { WEBSITE_REPO_REFS } from "~/data/site";
 *
 * const githubRef = WEBSITE_REPO_REFS.github;
 * if (githubRef) {
 *   // Safe to build URLs
 * }
 * ```
 */
export const WEBSITE_REPO_REFS = {
    github: { user: "r8vnhill", repo: "dibs-astro" },
    gitlab: { user: "r8vnhill", repo: "dibs-astro-website" },
} as const satisfies PartialRecord<RepoPlatform, RepoRef>;

/**
 * Returns the repository reference configured for a given platform.
 *
 * This is a thin, type-safe accessor over {@link WEBSITE_REPO_REFS}.
 *
 * Using this helper instead of direct indexing:
 *
 * - Improves readability at call sites.
 * - Makes intent explicit.
 * - Centralizes the lookup logic in case future validation is added.
 *
 * ## Example
 *
 * ```ts
 * const ref = getWebsiteRepoRef("github");
 * if (ref) {
 *   // ref is RepoRef
 * }
 * ```
 *
 * @param platform Hosting platform identifier.
 * @returns The configured {@link RepoRef}, or `undefined` if not available.
 */
export function getWebsiteRepoRef(platform: RepoPlatform): RepoRef | undefined {
    return WEBSITE_REPO_REFS[platform];
}
