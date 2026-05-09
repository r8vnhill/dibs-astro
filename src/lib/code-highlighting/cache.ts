/**
 * @file cache.ts
 *
 * Cache management utilities for the app's Shiki highlighter service.
 *
 * These exports provide test access to the shared highlighter cache for deterministic
 * test setup and isolation.
 */

import type { Highlighter } from "shiki";
import { appShikiService } from "./service";

/**
 * Resolved Shiki highlighter instance.
 */
export type HighlighterPromise = Promise<Highlighter>;

/**
 * Returns the shared Shiki highlighter.
 *
 * The highlighter is created lazily with the project's fixed Shiki defaults. Repeated callers
 * receive the same promise until the cache is reset or the initialization promise rejects.
 *
 * @returns Promise resolving to the shared highlighter
 */
export const getHighlighter = (): HighlighterPromise => appShikiService.getHighlighter();

/**
 * Test helper that resets the cached shared highlighter.
 *
 * Use this when a test needs to start from a deterministic empty-cache state.
 *
 * @internal
 */
export function __resetHighlighterCacheForTests() {
    // The package service uses global cache, so we reset via globalThis
    const globalCache = globalThis as any;
    delete globalCache.__dibsShikiHighlighterPromise;
}

/**
 * Test helper that overrides the cached highlighter.
 *
 * This is useful when tests need to inject a fake highlighter, a promise that resolves later, or
 * `null` to restore the normal lazy-creation path.
 *
 * @param value - Fake highlighter, highlighter promise, or `null` to clear the override
 * @internal
 */
export function __setHighlighterForTests(value: HighlighterPromise | Highlighter | null) {
    const globalCache = globalThis as any;
    if (value === null) {
        delete globalCache.__dibsShikiHighlighterPromise;
    } else if (value instanceof Promise) {
        globalCache.__dibsShikiHighlighterPromise = value;
    } else {
        globalCache.__dibsShikiHighlighterPromise = Promise.resolve(value);
    }
}
