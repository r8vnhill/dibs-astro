/**
 * @file cache.testing.ts
 *
 * Test-only cache mutation controls for the app's Shiki highlighter service.
 *
 * This module provides test helpers for setting up deterministic cache states and cleaning
 * up resources between tests. It is not part of the production API and should only be
 * imported by test files.
 *
 * @internal - Test-only module. Do not import in production code.
 */

import type { Highlighter } from "shiki";
import type { HighlighterPromise } from "./cache";

/**
 * Typed global cache shape to hold the cached highlighter promise.
 *
 * Using globalThis (the standard cross-environment way to access the global object)
 * works reliably in Astro/Vite test contexts.
 */
type ShikiGlobalCache = typeof globalThis & {
	[highlighterCacheKey]?: HighlighterPromise;
};

/**
 * Global cache key for the highlighter promise.
 *
 * Defined once here to ensure consistency across all cache operations.
 */
const highlighterCacheKey = "__dibsShikiHighlighterPromise" as const;

/**
 * Get the typed global cache object.
 *
 * @returns The global object with the cache slot
 */
const getGlobalCache = (): ShikiGlobalCache => globalThis as ShikiGlobalCache;

/**
 * Test helper that overrides the cached highlighter.
 *
 * This is useful when tests need to inject a fake highlighter, a promise that resolves later,
 * or `null` to restore the normal lazy-creation path.
 *
 * Accepts a raw highlighter, a highlighter promise, or null. Uses `Promise.resolve()` to
 * normalize the value, which returns the same promise if given a promise, and wraps
 * non-promise values in a new resolved promise.
 *
 * @param value - Fake highlighter, highlighter promise, or `null` to clear the override
 */
export function setHighlighterForTests(
	value: HighlighterPromise | Highlighter | null,
): void {
	const cache = getGlobalCache();

	if (value === null) {
		delete cache[highlighterCacheKey];
		return;
	}

	cache[highlighterCacheKey] = Promise.resolve(value);
}

/**
 * Test helper that resets the cached shared highlighter and cleans up resources.
 *
 * Use this when a test needs to start from a deterministic empty-cache state. The reset
 * deletes the global cache slot before awaiting cleanup to prevent stale state from
 * surviving the reset.
 *
 * If a previously resolved highlighter exists, it is disposed to avoid leaking Shiki
 * resources across tests. Rejected cached promises are tolerated during cleanup so that
 * reset is always safe to call in `afterEach`.
 *
 * @returns Promise that resolves when cleanup is complete
 */
export async function resetHighlighterCacheForTests(): Promise<void> {
	const cache = getGlobalCache();
	const previous = cache[highlighterCacheKey];

	// Delete the cache slot before awaiting cleanup to prevent stale state from surviving reset
	delete cache[highlighterCacheKey];

	// Await the previous promise and dispose the highlighter if it resolved successfully
	// Ignore rejected promises during cleanup so reset is safe in afterEach
	const highlighter = await previous?.catch(() => undefined);
	highlighter?.dispose();
}
