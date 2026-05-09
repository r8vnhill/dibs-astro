/**
 * Process-level global cache synchronization.
 *
 * Mirrors the highlighter promise to the global object so separate ESM contexts
 * within the same process can share the same singleton instance.
 */

import type { Highlighter } from "shiki";

/**
 * Global cache key used by the package and for compatibility.
 */
const GLOBAL_HIGHLIGHTER_KEY = "__dibsShikiHighlighterPromise";

/**
 * Extends the global object type for TypeScript.
 */
const globalCache = globalThis as typeof globalThis & {
    [GLOBAL_HIGHLIGHTER_KEY]?: Promise<Highlighter>;
};

/**
 * Stores a highlighter promise in the global cache.
 */
export function storeInGlobalCache(promise: Promise<Highlighter>): void {
    globalCache[GLOBAL_HIGHLIGHTER_KEY] = promise;
}

/**
 * Retrieves a highlighter promise from the global cache, if present.
 */
export function readFromGlobalCache(): Promise<Highlighter> | null {
    return globalCache[GLOBAL_HIGHLIGHTER_KEY] ?? null;
}

/**
 * Removes a highlighter promise from the global cache.
 */
export function clearGlobalCache(): void {
    delete globalCache[GLOBAL_HIGHLIGHTER_KEY];
}

/**
 * Synchronizes a cached promise with the global object.
 * Pass null to remove the global entry.
 */
export function syncToGlobal(promise: Promise<Highlighter> | null): void {
    if (promise) {
        storeInGlobalCache(promise);
    } else {
        clearGlobalCache();
    }
}
