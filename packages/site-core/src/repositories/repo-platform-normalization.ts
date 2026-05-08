import { DEFAULT_REPO_PLATFORMS, isRepoPlatform, type RepoPlatform } from "./repo-platform";

/**
 * Normalizes an arbitrary value into a valid platform list.
 *
 * The output is always non-empty, contains only known platforms, contains no duplicates, and
 * preserves first-seen order.
 */
export function normalizePlatforms(platforms?: unknown): RepoPlatform[] {
    if (!Array.isArray(platforms)) {
        return [...DEFAULT_REPO_PLATFORMS];
    }

    const selected = [...new Set(platforms.filter(isRepoPlatform))];
    return selected.length > 0 ? selected : [...DEFAULT_REPO_PLATFORMS];
}
