/**
 * Promise-backed cache for managing a shared resource lifecycle.
 *
 * Memoizes the promise itself (not just the resolved value) to allow concurrent
 * callers to share the same initialization work during startup. If the promise
 * rejects, it's cleared before rethrowing, allowing later callers to retry.
 */

import type { Store } from "./types";

/**
 * Dependencies for creating a store.
 */
interface StoreDeps<T> {
    /**
     * Factory function called at most once per cache lifecycle.
     * Called again if the cache is reset or the promise rejects.
     */
    create: () => Promise<T>;

    /**
     * Optional observer notified when the cached promise changes.
     * Useful for keeping external state (like globalThis) synchronized.
     */
    onSet?: (value: Promise<T> | null) => void;
}

/**
 * Creates a promise-backed store for managing a shared resource.
 */
export function createStore<T>({ create, onSet }: StoreDeps<T>): Store<T> {
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

        setForTests(value) {
            if (!value) {
                setCache(null);
                return;
            }

            setCache(Promise.resolve(value));
        },
    };
}
