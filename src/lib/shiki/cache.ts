/*
 * Compatibility wrapper for the shared Shiki highlighter lifecycle.
 *
 * This module delegates to @ravenhill/shiki-core for the real implementation.
 * It provides backward-compatible test helpers that existing tests depend on.
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

/**
 * Test helper for creating a generic store (kept for backward compatibility with tests).
 *
 * This is only used by the old cache tests. New tests should use the package service directly.
 *
 * @internal
 */
export function createHighlighterStore<T>({
    create,
    onSet,
}: {
    create: () => Promise<T>;
    onSet?: (value: Promise<T> | null) => void;
}) {
    let cachedPromise: Promise<T> | null = null;

    const setCache = (value: Promise<T> | null) => {
        cachedPromise = value;
        onSet?.(value);
    };

    return {
        get() {
            if (!cachedPromise) {
                const nextPromise = create().catch((error) => {
                    setCache(null);
                    throw error;
                });
                setCache(nextPromise);
            }
            return cachedPromise;
        },

        reset() {
            setCache(null);
        },

        setForTests(value: Promise<T> | T | null) {
            if (!value) {
                setCache(null);
                return;
            }
            setCache(Promise.resolve(value));
        },
    };
}
