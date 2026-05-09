/**
 * Warning deduplication for highlighter operations.
 *
 * Tracks warnings by kind and language to avoid flooding the console
 * with repeated messages.
 */

/**
 * Key types for different warning categories.
 */
type WarningKey = `unknown-language:${string}` | `load-failed:${string}`;

const warnedKeys = new Set<WarningKey>();

/**
 * Check if a warning for this language + kind should be issued.
 * Returns true if this is the first time we've seen it, false if already warned.
 */
export function shouldWarn(kind: "unknown-language" | "load-failed", language: string): boolean {
    const key: WarningKey = `${kind}:${language}`;
    if (warnedKeys.has(key)) {
        return false;
    }
    warnedKeys.add(key);
    return true;
}

/**
 * Clear all tracked warnings (for testing).
 */
export function resetWarnings(): void {
    warnedKeys.clear();
}
