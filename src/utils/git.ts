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
 * Builds consistent link text for repository links.
 *
 * ## Guarantees:
 *
 * - Trims whitespace from provided label.
 * - Falls back to `${user}/${repo}` when label is empty.
 * - Optionally appends the platform name.
 *
 * @param ref Repository reference.
 * @param platform Hosting platform.
 * @param options Formatting options.
 * @returns Visible link text.
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
        typeof value === "string" &&
        (DEFAULT_REPO_PLATFORMS as readonly string[]).includes(value)
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
