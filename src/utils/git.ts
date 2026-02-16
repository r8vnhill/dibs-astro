/**
 * @file utils/git.ts
 *
 * Git/repository primitives shared across the site.
 *
 * This module centralizes:
 *
 * - A minimal repository reference shape ({@link RepoRef})
 * - The supported hosting platforms ({@link RepoPlatform})
 * - Default platform ordering ({@link DEFAULT_REPO_PLATFORMS})
 * - Platform hostnames ({@link REPO_PLATFORM_HOST})
 * - Small parsing utilities for untrusted inputs ({@link isRepoPlatform},
 *   {@link normalizePlatforms})
 *
 * Keeping these definitions in one place avoids:
 *
 * - Duplicating `"github" | "gitlab"` unions in multiple components.
 * - Divergent defaults (e.g. one component showing GitLab first, another GitHub).
 * - Ad-hoc parsing logic in UI code when values come from frontmatter/JSON.
 */

/**
 * Minimal repository reference.
 *
 * This shape is intentionally small so it can be supplied from frontmatter, build-time metadata,
 * or runtime props without transformation.
 */
export interface RepoRef {
    /**
     * Repository owner or organization (e.g. `"r8vnhill"`).
     */
    user: string;

    /**
     * Repository name (e.g. `"dibs"`).
     */
    repo: string;
}

/**
 * Supported git hosting platforms.
 *
 * The rest of the system (e.g. link components) assumes that any platform value is one of these
 * literals.
 */
export type RepoPlatform = "github" | "gitlab";

/**
 * Default platform list used by UI components (e.g. `LessonRepoPanel`).
 *
 * ## Notes:
 *
 * - The array is declared `as const` to:
 *   - preserve literal types (`"gitlab"` not `string`)
 *   - prevent accidental mutation
 * - `satisfies` ensures every element is a valid {@link RepoPlatform}.
 *
 * Ordering matters: it is the order in which platforms are rendered by default.
 */
export const DEFAULT_REPO_PLATFORMS = [
    "gitlab",
    "github",
] as const satisfies readonly RepoPlatform[];

/**
 * Hostnames for each supported platform.
 *
 * This is useful when constructing URLs in a consistent way, without scattering host strings
 * throughout UI components.
 */
export const REPO_PLATFORM_HOST: Record<RepoPlatform, string> = {
    github: "github.com",
    gitlab: "gitlab.com",
};

/**
 * Type guard for {@link RepoPlatform}.
 *
 * This is designed for validating inputs that may come from:
 *
 * - frontmatter
 * - JSON configuration files
 * - query parameters
 *
 * ## Usage:
 *
 * ### Example 1: Narrowing an unknown value
 * ```ts
 * const platform: unknown = getConfig().platform;
 * if (isRepoPlatform(platform)) {
 *   // platform is now typed as RepoPlatform
 * }
 * ```
 *
 * ### Example 2: Filtering a list
 * ```ts
 * const platforms = ["github", "bad", "gitlab"].filter(isRepoPlatform);
 * // => RepoPlatform[]
 * ```
 *
 * @param value Unknown value to test.
 * @returns `true` if `value` is a supported {@link RepoPlatform}.
 */
export function isRepoPlatform(value: unknown): value is RepoPlatform {
    return (
        typeof value === "string"
        && (DEFAULT_REPO_PLATFORMS as readonly string[]).includes(value)
    );
}

/**
 * Normalizes a platform selection into a usable {@link RepoPlatform} list.
 *
 * ## Behavior:
 *
 * - If `platforms` is not an array, returns {@link DEFAULT_REPO_PLATFORMS}.
 * - Filters out invalid values using {@link isRepoPlatform}.
 * - Removes duplicates while preserving first-seen order.
 * - If the filtered selection is empty, falls back to {@link DEFAULT_REPO_PLATFORMS}.
 *
 * This function is intentionally forgiving to keep UI components simple: they can accept `unknown`
 * values (from frontmatter/JSON) and always get a safe result.
 *
 * ## Usage:
 *
 * ### Example 1: From frontmatter
 * ```ts
 * const platforms = normalizePlatforms(frontmatter.platforms);
 * ```
 *
 * ### Example 2: Explicit selection
 * ```ts
 * normalizePlatforms(["github", "github", "gitlab"]);
 * // => ["github", "gitlab"]
 * ```
 *
 * ### Example 3: Invalid input falls back
 * ```ts
 * normalizePlatforms(["bitbucket"]);
 * // => ["gitlab", "github"]
 * ```
 * 
 * @param platforms Potential platform list (possibly untrusted).
 * @returns A non-empty list of supported platforms
 */
export function normalizePlatforms(platforms?: unknown): RepoPlatform[] {
    if (!Array.isArray(platforms)) {
        return [...DEFAULT_REPO_PLATFORMS];
    }

    const selected = [...new Set(platforms.filter(isRepoPlatform))];
    return selected.length > 0 ? selected : [...DEFAULT_REPO_PLATFORMS];
}
