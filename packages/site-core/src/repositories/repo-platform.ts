/**
 * Supported git hosting platforms.
 */
export type RepoPlatform = "github" | "gitlab";

/**
 * Default platform ordering used by UI components.
 */
export const DEFAULT_REPO_PLATFORMS = [
    "gitlab",
    "github",
] as const satisfies readonly RepoPlatform[];

/**
 * Hostnames for each supported platform.
 */
export const REPO_PLATFORM_HOST: Record<RepoPlatform, string> = {
    github: "github.com",
    gitlab: "gitlab.com",
};

/**
 * Human-readable platform labels.
 */
export const REPO_PLATFORM_LABEL: Record<RepoPlatform, string> = {
    github: "GitHub",
    gitlab: "GitLab",
};

/**
 * Type guard for {@link RepoPlatform}.
 */
export function isRepoPlatform(value: unknown): value is RepoPlatform {
    return (
        typeof value === "string"
        && (DEFAULT_REPO_PLATFORMS as readonly string[]).includes(value)
    );
}
