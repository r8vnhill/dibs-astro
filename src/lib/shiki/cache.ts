/**
 * @deprecated Import from `~/lib/code-highlighting` instead.
 *
 * This module is part of the Phase 4 compatibility bridge. It will be removed in Phase 6.
 */

export type { HighlighterPromise } from "~/lib/code-highlighting";
export { getHighlighter, __resetHighlighterCacheForTests, __setHighlighterForTests } from "~/lib/code-highlighting";

/**
 * @deprecated Use the package service directly or the app-local boundary instead.
 *
 * Test helper for creating a generic store (kept for backward compatibility with tests).
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
