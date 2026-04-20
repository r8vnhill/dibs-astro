/*
 * Owns the shared Shiki highlighter lifecycle for the current process.
 *
 * This module caches the in-flight initialization promise instead of waiting for a fully resolved
 * highlighter. That allows concurrent callers to share the same startup work and prevents
 * duplicate initialization during bursts of demand.
 *
 * If initialization fails, the cached promise is cleared before the error is rethrown. This keeps
 * the singleton recoverable: a later call can retry the creation path instead of inheriting a
 * permanently rejected promise.
 *
 * Production code uses the process-level wrapper at the bottom of the file. Tests can target the
 * generic store directly or override the cached promise through the explicit test hooks.
 */
import { createHighlighter } from "shiki";
import type { ShikiTransformer } from "shiki";
import { runWithDevTransportRetry } from "~/utils";
import { SHIKI_DEFAULT_THEMES } from "./config";
import { availableLanguages } from "./language-aliases";

/**
 * Resolved Shiki highlighter instance returned by {@link createHighlighter}.
 */
export type Highlighter = Awaited<ReturnType<typeof createHighlighter>>;

/**
 * Promise that resolves to the shared {@link Highlighter}.
 *
 * This module memoizes promises, not only resolved values, so callers can share the same
 * initialization work while startup is still in progress.
 */
export type HighlighterPromise = Promise<Highlighter>;

/**
 * Dependencies required by {@link createHighlighterStore}.
 *
 * @param T
 *   Value produced by the store.
 */
interface HighlighterStoreDeps<T> {
    /**
     * Lazily creates the shared value.
     *
     * The factory is called at most once per cached lifecycle, unless the store is reset or the
     * promise rejects.
     */
    create: () => Promise<T>;

    /**
     * Optional observer notified whenever the cached promise changes.
     *
     * This is primarily useful for keeping an external cache, such as `globalThis`, synchronized
     * with the store's internal state.
     */
    onSet?: (value: Promise<T> | null) => void;
}

/**
 * Small promise-backed cache used to own a shared resource lifecycle.
 *
 * @param T
 *   Value managed by the store.
 */
interface HighlighterStore<T> {
    /**
     * Returns the shared value, creating it lazily on first access.
     *
     * Repeated or concurrent calls receive the same promise until the cache is cleared or creation
     * fails.
     */
    get(): Promise<T>;

    /**
     * Clears the cached promise.
     *
     * The next {@link get} call will invoke the creation path again.
     */
    reset(): void;

    /**
     * Overrides the cached value for tests.
     *
     * Accepts either:
     *
     * - an already created value;
     * - a promise resolving to that value; or
     * - `null` to restore the normal lazy-creation path.
     */
    setForTests(value: Promise<T> | T | null): void;
}

// Store the shared highlighter promise on the global object so separate ESM contexts in the same
// process can reuse or reset it deterministically.
const globalHighlighterCache = globalThis as typeof globalThis & {
    __dibsShikiHighlighterPromise?: HighlighterPromise;
};

const isRetryExplicitlyEnabled = () => process.env.DIBS_DEV_RETRY_ENABLED === "true";

/**
 * Creates a small store that memoizes a promise-backed shared value.
 *
 * The store caches the in-flight promise so concurrent callers reuse one initialization path. If
 * the promise rejects, the cache is cleared before the error is rethrown, which keeps the store
 * retryable.
 *
 * `setForTests` accepts either a resolved value or a promise to reduce friction in unit tests.
 * Both cases are normalized to a promise before caching.
 */
export function createHighlighterStore({
    create,
    onSet,
}: HighlighterStoreDeps<Highlighter>): HighlighterStore<Highlighter>;
export function createHighlighterStore<T>({
    create,
    onSet,
}: HighlighterStoreDeps<T>): HighlighterStore<T> {
    let sharedValuePromise: Promise<T> | null = null;

    // Replaces the current cached promise and propagates the new state to the optional external
    // observer.
    const assign = (value: Promise<T> | null) => {
        sharedValuePromise = value;
        onSet?.(value);
    };

    return {
        get() {
            if (!sharedValuePromise) {
                const nextPromise = create().catch((error) => {
                    assign(null);
                    throw error;
                });
                assign(nextPromise);
            }

            return sharedValuePromise as Promise<T>;
        },

        reset() {
            assign(null);
        },

        setForTests(value) {
            if (!value) {
                assign(null);
                return;
            }

            assign(Promise.resolve(value));
        },
    };
}

/**
 * Mirrors the store state into the process-level global cache.
 *
 * When the store holds a promise, that promise is exposed on `globalThis`. When the store is
 * cleared, the global entry is removed as well.
 */
function syncGlobalHighlighterPromise(value: HighlighterPromise | null) {
    if (value) {
        globalHighlighterCache.__dibsShikiHighlighterPromise = value;
        return;
    }

    delete globalHighlighterCache.__dibsShikiHighlighterPromise;
}

/**
 * Creates the process-wide Shiki highlighter promise using the project's fixed defaults.
 *
 * The creation path is wrapped with {@link runWithDevTransportRetry} so transient development
 * transport failures do not immediately break highlighting.
 */
const createSharedHighlighter = (): HighlighterPromise =>
    runWithDevTransportRetry(
        async ({ signal: _signal }) =>
            createHighlighter({
                themes: [...SHIKI_DEFAULT_THEMES],
                langs: availableLanguages,
            }),
        {
            label: "shared shiki highlighter creation",
            // Keep the shared bootstrap deterministic under Vitest unless a test opts into retry
            // behavior explicitly through the supported environment flag.
            ...(process.env.VITEST === "true"
                ? { enabled: isRetryExplicitlyEnabled() }
                : {}),
        },
    );

/**
 * Process-level store used by production code and most tests.
 *
 * The store keeps its internal cache synchronized with the global cache so separate ESM contexts
 * can observe the same shared initialization promise.
 */
const highlighterStore = createHighlighterStore({
    create: createSharedHighlighter,
    onSet: syncGlobalHighlighterPromise,
});

// ## Rehydrate the process-level store from an already populated global cache. ##
// This allows the module to preserve singleton behavior even when it is evaluated again in another
// ESM context within the same process.
const cachedGlobalHighlighterPromise = globalHighlighterCache.__dibsShikiHighlighterPromise;
if (cachedGlobalHighlighterPromise) {
    highlighterStore.setForTests(cachedGlobalHighlighterPromise);
}

/**
 * Returns the shared Shiki highlighter.
 *
 * The highlighter is created lazily with the project's fixed Shiki defaults. Repeated callers
 * receive the same promise until the cache is reset or the initialization promise rejects.
 *
 * @returns
 *   Promise resolving to the shared {@link Highlighter}.
 */
export const getHighlighter = (): HighlighterPromise => highlighterStore.get();

/**
 * Test helper that clears the cached shared highlighter.
 *
 * Use this when a test needs to start from a deterministic empty-cache state.
 */
export function __resetHighlighterCacheForTests() {
    highlighterStore.reset();
}

/**
 * Test helper that overrides the cached highlighter.
 *
 * This is useful when tests need to inject a fake highlighter, a promise that resolves later, or
 * `null` to restore the normal lazy-creation path.
 *
 * @param value
 *   Fake highlighter, highlighter promise, or `null` to clear the override.
 */
export function __setHighlighterForTests(value: HighlighterPromise | Highlighter | null) {
    highlighterStore.setForTests(value);
}

/**
 * Re-exported Shiki transformer type.
 *
 * This lets callers and tests reference the transformer contract without importing `shiki`
 * directly.
 */
export type { ShikiTransformer };
