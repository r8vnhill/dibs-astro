/**
 * @file utils/git.ts
 *
 * Centralized git/repository primitives and helpers.
 *
 * ## This module provides a small, well-defined surface for:
 *
 * - Repository references ({@link RepoRef})
 * - Supported hosting platforms ({@link RepoPlatform})
 * - Platform metadata (labels + hostnames)
 * - URL construction ({@link buildRepoUrl})
 * - Link text formatting ({@link buildRepoLinkText})
 * - Validation and normalization helpers
 *
 * ## Design goals:
 *
 * - Avoid scattering `"github" | "gitlab"` unions across the codebase.
 * - Keep UI components free of string concatenation logic.
 * - Ensure safe handling of untrusted inputs (frontmatter, JSON, query params).
 * - Provide deterministic defaults.
 *
 * ## All helpers are:
 *
 * - Pure
 * - Side-effect free
 * - Easily unit-testable
 * - Dependency-free
 */

/**
 * Minimal repository reference.
 *
 * This is intentionally small and serializable. It represents only the identity of a repository
 * --- not its URL, branch, or host.
 *
 * ## By keeping this minimal, we:
 *
 * - Decouple repository identity from hosting concerns.
 * - Keep props lightweight.
 * - Enable reuse across build-time and runtime contexts.
 */
export interface RepoRef {
    /**
     * Repository owner or organization.
     *
     * Example: `"r8vnhill"`, `"openai"`.
     */
    user: string;

    /**
     * Repository name.
     *
     * Example: `"dibs"`, `"astro"`.
     */
    repo: string;
}

/**
 * Supported git hosting platforms.
 *
 * This union defines the canonical set of allowed platforms. All platform-related logic (labels,
 * hosts, URL construction) must be derived from this type.
 *
 * If a new platform is added, TypeScript will enforce updating:
 *
 * - {@link REPO_PLATFORM_HOST}
 * - {@link REPO_PLATFORM_LABEL}
 * - Any switch-based logic
 */
export type RepoPlatform = "github" | "gitlab";

/**
 * Default platform ordering used by UI components.
 *
 * ## Key properties:
 *
 * - Declared `as const` to preserve literal types.
 * - Uses `satisfies` to ensure all entries are valid {@link RepoPlatform}.
 * - Immutable (defensive copy required before modification).
 *
 * Ordering matters --- it determines rendering order in UI panels.
 */
export const DEFAULT_REPO_PLATFORMS = [
    "gitlab",
    "github",
] as const satisfies readonly RepoPlatform[];

/**
 * Hostnames for each supported platform.
 *
 * Used by {@link buildRepoUrl}.
 *
 * ## Keeping hostnames centralized:
 *
 * - Prevents duplication.
 * - Avoids hardcoding in UI components.
 * - Simplifies adding new platforms.
 */
export const REPO_PLATFORM_HOST: Record<RepoPlatform, string> = {
    github: "github.com",
    gitlab: "gitlab.com",
};

/**
 * Human-readable platform labels.
 *
 * Used for display and accessibility text.
 */
export const REPO_PLATFORM_LABEL: Record<RepoPlatform, string> = {
    github: "GitHub",
    gitlab: "GitLab",
};

/**
 * Options for {@link buildRepoUrl}.
 */
export interface BuildRepoUrlOptions {
    /**
     * Optional repository subpath.
     *
     * Examples:
     * - `"tree/main"`
     * - `"blob/main/README.md"`
     * - `"/tree/main"` (leading slash will be normalized)
     */
    path?: string;
}

/**
 * Builds the canonical HTTPS repository URL.
 *
 * ## Guarantees:
 *
 * - Always returns an absolute `https://` URL.
 * - Never produces double slashes in the appended path.
 * - Trims and normalizes the optional path.
 *
 * ## Does NOT:
 *
 * - Validate repository existence.
 * - Encode path segments.
 *
 * ## Examples
 *
 * ```ts
 * buildRepoUrl({ user: "r8vnhill", repo: "dibs" }, "github")
 * // -> https://github.com/r8vnhill/dibs
 *
 * buildRepoUrl(
 *   { user: "r8vnhill", repo: "dibs" },
 *   "github",
 *   { path: "tree/main" }
 * )
 * // -> https://github.com/r8vnhill/dibs/tree/main
 * ```
 *
 * @param ref Repository reference.
 * @param platform Hosting platform.
 * @param options Optional path configuration.
 * @returns Absolute repository URL.
 */
export function buildRepoUrl(
    ref: RepoRef,
    platform: RepoPlatform,
    options?: BuildRepoUrlOptions,
): string {
    const baseUrl = `https://${REPO_PLATFORM_HOST[platform]}/${ref.user}/${ref.repo}`;
    const rawPath = options?.path?.trim();

    if (!rawPath) {
        return baseUrl;
    }

    const normalizedPath = rawPath.replace(/^\/+/, "");
    return `${baseUrl}/${normalizedPath}`;
}

/**
 * Options for {@link buildRepoLinkText}.
 */
export interface BuildRepoLinkTextOptions {
    /**
     * Optional visible label override.
     */
    label?: string;

    /**
     * Whether to append the platform name.
     *
     * Example:
     * - false -> "user/repo"
     * - true  -> "user/repo (GitHub)"
     */
    showPlatform?: boolean;
}
/**
 * Optional configuration for {@link buildCommitUrl}.
 */
export interface BuildCommitUrlOptions {
    /**
     * Optional subpath appended after the commit route.
     *
     * This allows linking to:
     *
     * - A specific file within the commit.
     * - A diff fragment.
     * - Any platform-supported nested path.
     *
     * The value is:
     *
     * - Trimmed.
     * - Normalized by removing leading slashes.
     *
     * ## Example
     *
     * ```ts
     * buildCommitUrl(
     *   { user: "octocat", repo: "hello-world" },
     *   "github",
     *   "abc1234",
     *   { path: "README.md" }
     * );
     * // => https://github.com/octocat/hello-world/commit/abc1234/README.md
     * ```
     */
    path?: string;
}

/**
 * Builds consistent, user-facing link text for repository links.
 *
 * This function centralizes formatting logic so UI components do not duplicate string construction
 * rules.
 *
 * ## Guarantees
 *
 * - Trims whitespace from a provided `label`.
 * - Falls back to `${user}/${repo}` if the label is missing or blank.
 * - Optionally appends the human-readable platform name.
 * - Never returns an empty string.
 *
 * This makes it safe to use directly inside UI components.
 *
 * ## Examples
 *
 * ### Example 1: Default behavior
 *
 * ```ts
 * buildRepoLinkText(
 *   { user: "luis-miguel", repo: "soy-como-quiero-ser" },
 *   "github"
 * );
 * // => "luis-miguel/soy-como-quiero-ser"
 * ```
 *
 * ### Example 2: Custom label
 *
 * ```ts
 * buildRepoLinkText(
 *   { user: "ozzy", repo: "black-rain" },
 *   "github",
 *   { label: "Source code" }
 * );
 * // => "Source code"
 * ```
 *
 * ### Example 3: With platform suffix
 *
 * ```ts
 * buildRepoLinkText(
 *   { user: "pearl-jam", repo: "vitalogy" },
 *   "github",
 *   { showPlatform: true }
 * );
 * // => "pearl-jam/vitalogy (GitHub)"
 * ```
 *
 * @param ref Repository reference ({@link RepoRef}).
 * @param platform Hosting platform ({@link RepoPlatform}).
 * @param options Formatting options.
 * @returns Visible link text for rendering.
 */
export function buildRepoLinkText(
    ref: RepoRef,
    platform: RepoPlatform,
    options?: BuildRepoLinkTextOptions,
): string {
    const trimmedLabel = options?.label?.trim();
    const baseLabel = trimmedLabel && trimmedLabel.length > 0
        ? trimmedLabel
        : `${ref.user}/${ref.repo}`;

    return options?.showPlatform
        ? `${baseLabel} (${REPO_PLATFORM_LABEL[platform]})`
        : baseLabel;
}

/**
 * Builds the canonical commit URL for a repository.
 *
 * This abstracts platform-specific commit routes so that:
 *
 * - UI components do not need conditional logic.
 * - Platform differences are centralized in one place.
 *
 * ## Platform Differences
 *
 * - GitHub:
 *   `/commit/{hash}`
 *
 * - GitLab:
 *   `/-/commit/{hash}`
 *
 * ## Guarantees
 *
 * - Trims whitespace from the commit hash.
 * - Preserves the full hash (no truncation).
 * - Normalizes optional extra path segments.
 * - Delegates final URL construction to {@link buildRepoUrl}.
 *
 * ## Examples
 *
 * ### Example 1: GitHub
 *
 * ```ts
 * buildCommitUrl(
 *   { user: "mcr", repo: "the-black-parade" },
 *   "github",
 *   "abc1234"
 * );
 * // => https://github.com/mcr/the-black-parade/commit/abc1234
 * ```
 *
 * ### Example 2: GitLab
 *
 * ```ts
 * buildCommitUrl(
 *   { user: "iron-maiden", repo: "powerslave" },
 *   "gitlab",
 *   "def5678"
 * );
 * // => https://gitlab.com/iron-maiden/powerslave/-/commit/def5678
 * ```
 *
 * ### Example 3: With extra path
 *
 * ```ts
 * buildCommitUrl(
 *   { user: "judas-priest", repo: "turbo" },
 *   "github",
 *   "abc1234",
 *   { path: "README.md" }
 * );
 * // => https://github.com/judas-priest/turbo/commit/abc1234/README.md
 * ```
 *
 * @param ref Repository reference ({@link RepoRef}).
 * @param platform Hosting platform ({@link RepoPlatform}).
 * @param hash Commit hash (full or abbreviated).
 * @param options Optional configuration ({@link BuildCommitUrlOptions}).
 * @returns Absolute HTTPS URL to the commit.
 */
export function buildCommitUrl(
    ref: RepoRef,
    platform: RepoPlatform,
    hash: string,
    options?: BuildCommitUrlOptions,
): string {
    const safeHash = hash.trim();

    const commitPath = platform === "gitlab"
        ? `-/commit/${safeHash}`
        : `commit/${safeHash}`;

    const extraPath = options?.path?.trim().replace(/^\/+/, "");
    const path = extraPath ? `${commitPath}/${extraPath}` : commitPath;

    return buildRepoUrl(ref, platform, { path });
}

/**
 * Type guard for {@link RepoPlatform}.
 *
 * Used to validate untrusted values.
 *
 * ## Designed for:
 *
 * - Frontmatter parsing
 * - JSON configuration
 * - Query parameter handling
 *
 * ## This function ensures:
 *
 * - Only known platforms are accepted.
 * - Invalid inputs fail safely.
 *
 * @param value Unknown value.
 * @returns True if value is a supported platform.
 */
export function isRepoPlatform(value: unknown): value is RepoPlatform {
    return (
        typeof value === "string"
        && (DEFAULT_REPO_PLATFORMS as readonly string[]).includes(value)
    );
}

/**
 * Normalizes an arbitrary value into a valid platform list.
 *
 * ## Guarantees:
 *
 * - Output is always non-empty.
 * - Output contains only valid {@link RepoPlatform} values.
 * - Output contains no duplicates.
 * - Output preserves first-seen order.
 *
 * ## Fallback behavior:
 *
 * - Non-array input -> defaults.
 * - Array with only invalid entries -> defaults.
 *
 * This function makes UI components robust against malformed inputs.
 *
 * @param platforms Possibly untrusted value.
 * @returns Non-empty array of valid platforms.
 */
export function normalizePlatforms(platforms?: unknown): RepoPlatform[] {
    if (!Array.isArray(platforms)) {
        return [...DEFAULT_REPO_PLATFORMS];
    }

    const selected = [...new Set(platforms.filter(isRepoPlatform))];
    return selected.length > 0 ? selected : [...DEFAULT_REPO_PLATFORMS];
}
